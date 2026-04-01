const express = require("express");
const path = require("path");
const { ensureStore, readStore, saveStore } = require("./dataStore");
const { validateExpense } = require("./validation");
const { getSummary, getGoalStatus, getAccountStatus, getInsights } = require("./financeService");
const { chatWithFinanceAgent, clearAgentSession } = require("./agentService");

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

const FRONTEND_DIR = path.join(__dirname, "..", "..", "frontend");
app.use(express.static(FRONTEND_DIR));

function getCategoryMap(categories) {
  return new Map(categories.map((c) => [c.id, c]));
}

function enrichExpense(expense, categoryMap) {
  const category = categoryMap.get(expense.categoryId);
  return {
    ...expense,
    categoryName: category ? category.name : "Outros",
    categoryIcon: category ? category.icon : "📦"
  };
}

function normalizeSettings(settings = {}) {
  return {
    monthlyGoal: Number.isFinite(Number(settings.monthlyGoal)) ? Number(settings.monthlyGoal) : 0,
    accountStartingBalance: Number.isFinite(Number(settings.accountStartingBalance))
      ? Number(settings.accountStartingBalance)
      : 0
  };
}

app.get("/api/categories", async (_req, res) => {
  const store = await readStore();
  res.json(store.categories);
});

app.get("/api/expenses", async (req, res) => {
  const store = await readStore();
  const categoryMap = getCategoryMap(store.categories);
  const { categoryId, startDate, endDate, q, sortBy = "date", order = "desc" } = req.query;

  let filtered = [...store.expenses];
  if (categoryId) filtered = filtered.filter((e) => e.categoryId === Number(categoryId));
  if (startDate) filtered = filtered.filter((e) => e.date >= startDate);
  if (endDate) filtered = filtered.filter((e) => e.date <= endDate);
  if (q) {
    const query = String(q).toLowerCase();
    filtered = filtered.filter((e) => e.description.toLowerCase().includes(query));
  }

  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "amount") cmp = a.amount - b.amount;
    else cmp = a.date.localeCompare(b.date) || a.id - b.id;
    return order === "asc" ? cmp : -cmp;
  });

  res.json(filtered.map((e) => enrichExpense(e, categoryMap)));
});

app.post("/api/expenses", async (req, res) => {
  const store = await readStore();
  const validation = validateExpense(req.body, store.categories);
  if (!validation.valid) return res.status(400).json({ error: validation.error });

  const expense = {
    id: store.nextExpenseId,
    ...validation.expense
  };
  store.nextExpenseId += 1;
  store.expenses.push(expense);
  await saveStore(store);

  const categoryMap = getCategoryMap(store.categories);
  res.status(201).json(enrichExpense(expense, categoryMap));
});

app.put("/api/expenses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const store = await readStore();
  const index = store.expenses.findIndex((e) => e.id === id);
  if (index === -1) return res.status(404).json({ error: "Gasto não encontrado." });

  const validation = validateExpense(req.body, store.categories);
  if (!validation.valid) return res.status(400).json({ error: validation.error });

  store.expenses[index] = {
    ...store.expenses[index],
    ...validation.expense
  };

  await saveStore(store);
  const categoryMap = getCategoryMap(store.categories);
  res.json(enrichExpense(store.expenses[index], categoryMap));
});

app.delete("/api/expenses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const store = await readStore();
  const index = store.expenses.findIndex((e) => e.id === id);
  if (index === -1) return res.status(404).json({ error: "Gasto não encontrado." });

  const [deleted] = store.expenses.splice(index, 1);
  await saveStore(store);
  res.json({ success: true, deletedId: deleted.id });
});

app.get("/api/summary", async (_req, res) => {
  const store = await readStore();
  const summary = getSummary(store);
  res.json(summary);
});

app.get("/api/goal", async (_req, res) => {
  const store = await readStore();
  store.settings = normalizeSettings(store.settings);
  const summary = getSummary(store);
  const goal = getGoalStatus(store.settings.monthlyGoal || 0, summary.totalMonth);
  res.json(goal);
});

app.put("/api/goal", async (req, res) => {
  const store = await readStore();
  store.settings = normalizeSettings(store.settings);
  const monthlyGoal = Number(req.body.monthlyGoal);
  if (!Number.isFinite(monthlyGoal) || monthlyGoal <= 0) {
    return res.status(400).json({ error: "Informe uma meta mensal válida." });
  }

  store.settings.monthlyGoal = Number(monthlyGoal.toFixed(2));
  await saveStore(store);

  const summary = getSummary(store);
  const goal = getGoalStatus(store.settings.monthlyGoal, summary.totalMonth);
  res.json(goal);
});

app.get("/api/account", async (_req, res) => {
  const store = await readStore();
  store.settings = normalizeSettings(store.settings);
  const summary = getSummary(store);
  const account = getAccountStatus(
    store.settings.accountStartingBalance,
    summary.totalMonth,
    summary.totalToday
  );
  res.json(account);
});

app.put("/api/account", async (req, res) => {
  const store = await readStore();
  store.settings = normalizeSettings(store.settings);
  const accountStartingBalance = Number(req.body.accountStartingBalance);
  if (!Number.isFinite(accountStartingBalance) || accountStartingBalance < 0) {
    return res.status(400).json({ error: "Informe um saldo inicial válido." });
  }

  store.settings.accountStartingBalance = Number(accountStartingBalance.toFixed(2));
  await saveStore(store);

  const summary = getSummary(store);
  const account = getAccountStatus(
    store.settings.accountStartingBalance,
    summary.totalMonth,
    summary.totalToday
  );
  res.json(account);
});

app.get("/api/analytics", async (_req, res) => {
  const store = await readStore();
  const summary = getSummary(store);
  const insights = getInsights(summary);
  res.json({
    categoryChart: summary.categoryChart,
    weeklyComparison: summary.weeklyComparison,
    highlights: insights
  });
});

app.post("/api/agent/chat", async (req, res) => {
  const message = String(req.body && req.body.message ? req.body.message : "").trim();
  const sessionId = String(req.body && req.body.sessionId ? req.body.sessionId : "default").trim();

  if (!message) {
    return res.status(400).json({ error: "Informe uma mensagem valida." });
  }

  try {
    const response = await chatWithFinanceAgent({
      sessionId: sessionId || "default",
      message
    });
    res.json(response);
  } catch (error) {
    const statusCode = Number(error.statusCode) || 500;
    res.status(statusCode).json({
      error: error.userMessage || "Falha ao processar mensagem do agente."
    });
  }
});

app.delete("/api/agent/session/:sessionId", (req, res) => {
  const sessionId = String(req.params.sessionId || "").trim();
  if (!sessionId) {
    return res.status(400).json({ error: "SessionId invalido." });
  }

  clearAgentSession(sessionId);
  res.json({ success: true, sessionId });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

ensureStore().then(() => {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Pulse Finance rodando em http://localhost:${PORT}`);
  });
});
