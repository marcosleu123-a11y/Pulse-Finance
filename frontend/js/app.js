import { api } from "./api.js";
import { state, setState } from "./state.js";
import { renderDashboardCharts, renderAnalyticsCharts } from "./charts.js";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const motivationTexts = [
  "Pequenos controles geram grandes resultados.",
  "Cada registro te dá mais clareza.",
  "Seu dinheiro merece direção, não improviso."
];
const assistantState = {
  sessionId: "pulse-web",
  messages: [],
  isSending: false,
  model: ""
};

function $(selector) {
  return document.querySelector(selector);
}

let modalLastFocusedElement = null;

function formatCurrency(value) {
  return GBP.format(Number(value || 0));
}

function parseCurrencyInput(raw) {
  const cleaned = String(raw || "").trim().replace(/[^\d.,-]/g, "");
  if (!cleaned) return Number.NaN;

  const isNegative = cleaned.includes("-");
  const unsigned = cleaned.replace(/-/g, "");
  const lastComma = unsigned.lastIndexOf(",");
  const lastDot = unsigned.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  let normalizedInteger = unsigned.replace(/[^\d]/g, "");
  let normalizedFraction = "";
  if (decimalIndex !== -1) {
    const fractionCandidate = unsigned.slice(decimalIndex + 1).replace(/[^\d]/g, "");
    if (fractionCandidate.length > 0 && fractionCandidate.length <= 2) {
      normalizedInteger = unsigned.slice(0, decimalIndex).replace(/[^\d]/g, "");
      normalizedFraction = fractionCandidate;
    }
  }

  if (!normalizedInteger && !normalizedFraction) return Number.NaN;
  const normalizedValue = normalizedFraction
    ? `${normalizedInteger || "0"}.${normalizedFraction}`
    : normalizedInteger;
  const parsed = Number(normalizedValue);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return isNegative ? -parsed : parsed;
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function showTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-content").forEach((section) => {
    section.classList.toggle("active", section.id === tabId);
  });
}

function renderCategories() {
  const options = state.categories
    .map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`)
    .join("");
  $("#categoryInput").innerHTML = options;
  $("#editCategory").innerHTML = options;
  $("#filterCategory").innerHTML = `<option value="">Todas categorias</option>${options}`;
}

function renderCategoryChips() {
  $("#categoryChips").innerHTML = state.categories
    .map((category) => `<button type="button" class="chip" data-category-id="${category.id}">${category.icon} ${category.name}</button>`)
    .join("");
}

function createRecentExpenseElement(item) {
  const li = document.createElement("li");
  li.className = "recent-item";

  const details = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = `${item.categoryIcon || ""} ${item.description || ""}`.trim();

  const dateLine = document.createElement("small");
  const date = item.date || "-";
  const paymentMethod = item.paymentMethod || "-";
  dateLine.textContent = `${date} - ${paymentMethod}`;

  details.appendChild(title);
  details.appendChild(document.createElement("br"));
  details.appendChild(dateLine);

  const amount = document.createElement("strong");
  amount.textContent = formatCurrency(item.amount);

  li.appendChild(details);
  li.appendChild(amount);
  return li;
}

function createHistoryTextCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function createHistoryActionCell(id) {
  const cell = document.createElement("td");
  const rowActions = document.createElement("div");
  rowActions.className = "row-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "inline-btn";
  editBtn.dataset.action = "edit";
  editBtn.dataset.id = String(id);
  editBtn.textContent = "Editar";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "inline-btn delete";
  deleteBtn.dataset.action = "delete";
  deleteBtn.dataset.id = String(id);
  deleteBtn.textContent = "Excluir";

  rowActions.appendChild(editBtn);
  rowActions.appendChild(deleteBtn);
  cell.appendChild(rowActions);
  return cell;
}

function createHistoryRow(item) {
  const row = document.createElement("tr");
  row.appendChild(createHistoryTextCell(item.date || ""));
  row.appendChild(createHistoryTextCell(`${item.categoryIcon || ""} ${item.categoryName || ""}`.trim()));
  row.appendChild(createHistoryTextCell(item.description || ""));
  row.appendChild(createHistoryTextCell(item.paymentMethod || ""));
  row.appendChild(createHistoryTextCell(formatCurrency(item.amount)));
  row.appendChild(createHistoryActionCell(item.id));
  return row;
}

function renderDashboard() {
  if (!state.summary) return;
  const summary = state.summary;
  $("#totalToday").textContent = formatCurrency(summary.totalToday);
  $("#totalWeek").textContent = formatCurrency(summary.totalWeek);
  $("#totalMonth").textContent = formatCurrency(summary.totalMonth);
  $("#topCategory").textContent = summary.topCategory ? summary.topCategory.name : "-";
  $("#totalRecords").textContent = summary.totalRecords;
  $("#accountCurrentBalance").textContent = state.account
    ? formatCurrency(state.account.currentBalance)
    : formatCurrency(0);
  $("#accountCurrentBalance").classList.toggle(
    "balance-negative",
    Boolean(state.account && state.account.currentBalance < 0)
  );

  const recentExpensesList = $("#recentExpenses");
  recentExpensesList.replaceChildren();
  if (summary.recentExpenses.length) {
    summary.recentExpenses.forEach((item) => {
      recentExpensesList.appendChild(createRecentExpenseElement(item));
    });
  } else {
    const emptyState = document.createElement("li");
    emptyState.className = "subtle";
    emptyState.textContent = "Sem gastos recentes.";
    recentExpensesList.appendChild(emptyState);
  }

  renderDashboardCharts(summary);
}

function renderAccount() {
  if (!state.account) return;
  const account = state.account;
  $("#accountStartingBalanceInput").value = account.accountStartingBalance || "";
  $("#accountCurrentBalanceGoal").textContent = formatCurrency(account.currentBalance);
  $("#accountSpentMonth").textContent = formatCurrency(account.spentThisMonth);
  $("#accountSpentToday").textContent = formatCurrency(account.spentToday);
  $("#accountCurrentBalanceGoal").classList.toggle("balance-negative", account.currentBalance < 0);
}

function getFilteredExpenses() {
  let list = [...state.expenses];
  const category = $("#filterCategory").value;
  const startDate = $("#filterStartDate").value;
  const endDate = $("#filterEndDate").value;
  const search = $("#filterSearch").value.trim().toLowerCase();
  const sort = $("#filterSort").value;

  if (category) list = list.filter((item) => item.categoryId === Number(category));
  if (startDate) list = list.filter((item) => item.date >= startDate);
  if (endDate) list = list.filter((item) => item.date <= endDate);
  if (search) list = list.filter((item) => item.description.toLowerCase().includes(search));

  list.sort((a, b) => {
    if (sort === "amount_asc") return a.amount - b.amount;
    if (sort === "amount_desc") return b.amount - a.amount;
    if (sort === "date_asc") return a.date.localeCompare(b.date);
    return b.date.localeCompare(a.date) || b.id - a.id;
  });

  return list;
}

function renderHistory() {
  const tableBody = $("#historyTableBody");
  tableBody.replaceChildren();
  const filteredExpenses = getFilteredExpenses();

  if (!filteredExpenses.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "Nenhum gasto encontrado.";
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  filteredExpenses.forEach((item) => {
    tableBody.appendChild(createHistoryRow(item));
  });
}

function renderGoal() {
  if (!state.goal) return;
  const { totalMonth, remaining, percent, status, monthlyGoal } = state.goal;
  const safePercent = Math.max(0, Math.min(percent, 100));
  const bar = $("#goalBar");
  bar.style.width = `${safePercent}%`;
  bar.style.background =
    status === "danger"
      ? "linear-gradient(90deg,#ff5d73,#ff7c8f)"
      : status === "warn"
        ? "linear-gradient(90deg,#ffc857,#ffe190)"
        : "linear-gradient(90deg,#45f0b4,#48b8ff)";

  $("#goalInput").value = monthlyGoal || "";
  $("#goalSpent").textContent = formatCurrency(totalMonth);
  $("#goalRemaining").textContent = formatCurrency(remaining);
  $("#goalPercent").textContent = `${percent}%`;

  const alert = $("#goalAlert");
  alert.className = "goal-alert";
  if (status === "danger") {
    alert.classList.add("danger");
    alert.textContent = "Meta atingida ou ultrapassada. Hora de revisar os gastos.";
  } else if (status === "warn") {
    alert.classList.add("warn");
    alert.textContent = "Você está perto da meta mensal. Atenção aos próximos lançamentos.";
  } else {
    alert.textContent = "Meta dentro do planejado.";
  }
}

function renderAnalytics() {
  if (!state.analytics) return;
  $("#analyticsHighlights").innerHTML = state.analytics.highlights
    .map((text) => `<li>${text}</li>`)
    .join("");
  renderAnalyticsCharts(state.analytics);
}

function getAssistantStatusText() {
  const model = assistantState.model ? ` | Modelo: ${assistantState.model}` : "";
  return `Sessao: ${assistantState.sessionId}${model}`;
}

function setAssistantStatus(text) {
  const status = $("#assistantStatus");
  if (!status) return;
  status.textContent = text;
}

function createAssistantMessageElement(message) {
  const bubble = document.createElement("div");
  const role = message.role === "user" ? "user" : message.role === "assistant" ? "assistant" : "system";
  bubble.className = `chat-msg ${role}`;
  bubble.textContent = message.text;

  if (message.meta) {
    const meta = document.createElement("small");
    meta.className = "chat-msg-meta";
    meta.textContent = message.meta;
    bubble.appendChild(meta);
  }

  return bubble;
}

function renderAssistantMessages() {
  const container = $("#assistantMessages");
  if (!container) return;
  container.replaceChildren();
  assistantState.messages.forEach((message) => {
    container.appendChild(createAssistantMessageElement(message));
  });
  container.scrollTop = container.scrollHeight;
}

function pushAssistantMessage(role, text, meta = "") {
  assistantState.messages.push({
    role,
    text: String(text || "").trim() || "Sem conteudo.",
    meta
  });
  assistantState.messages = assistantState.messages.slice(-40);
  renderAssistantMessages();
}

function setAssistantLoading(isLoading) {
  assistantState.isSending = isLoading;
  const sendBtn = $("#assistantSendBtn");
  const input = $("#assistantInput");
  if (sendBtn) {
    sendBtn.disabled = isLoading;
    sendBtn.textContent = isLoading ? "Enviando..." : "Enviar";
  }
  if (input) input.disabled = isLoading;
}

function bindAssistant() {
  const form = $("#assistantForm");
  const input = $("#assistantInput");
  const clearButton = $("#clearAgentSessionBtn");
  if (!form || !input || !clearButton) return;

  assistantState.messages = [
    {
      role: "system",
      text: "Pergunte sobre seus gastos, meta ou saldo. O agente usa os dados reais do app."
    }
  ];
  renderAssistantMessages();
  setAssistantStatus(getAssistantStatusText());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (assistantState.isSending) return;

    const userText = input.value.trim();
    if (!userText) return;

    pushAssistantMessage("user", userText);
    input.value = "";
    setAssistantLoading(true);
    setAssistantStatus("Consultando Ollama local...");

    try {
      const response = await api.chatWithAgent(userText, assistantState.sessionId);
      assistantState.model = String(response.model || assistantState.model || "");
      const tools = Array.isArray(response.usedTools) && response.usedTools.length
        ? `Ferramentas usadas: ${response.usedTools.join(", ")}`
        : "";
      pushAssistantMessage("assistant", response.reply || "Nao houve resposta do agente.", tools);
      setAssistantStatus(getAssistantStatusText());
    } catch (error) {
      pushAssistantMessage(
        "system",
        `Falha ao consultar o agente: ${error.message}`
      );
      setAssistantStatus("Nao foi possivel consultar o agente. Verifique o Ollama.");
    } finally {
      setAssistantLoading(false);
      input.focus();
    }
  });

  clearButton.addEventListener("click", async () => {
    if (assistantState.isSending) return;
    try {
      await api.clearAgentSession(assistantState.sessionId);
      assistantState.messages = [
        {
          role: "system",
          text: "Conversa limpa. Pode enviar uma nova pergunta."
        }
      ];
      renderAssistantMessages();
      setAssistantStatus(getAssistantStatusText());
      input.focus();
    } catch (error) {
      pushAssistantMessage("system", `Falha ao limpar conversa: ${error.message}`);
    }
  });
}

function bindTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.dataset.tab));
  });
}

function bindQuickActions() {
  $("#quickAddTodayBtn").addEventListener("click", () => {
    showTab("quick-add");
    $("#dateInput").value = getTodayDate();
    $("#amountInput").focus();
  });

  $("#categoryChips").addEventListener("click", (event) => {
    const target = event.target.closest(".chip");
    if (!target) return;
    $("#categoryInput").value = target.dataset.categoryId;
  });
}

function bindAmountFormatting() {
  const amountInput = $("#amountInput");
  const editAmountInput = $("#editAmount");
  [amountInput, editAmountInput].forEach((input) => {
    input.addEventListener("blur", () => {
      const parsed = parseCurrencyInput(input.value);
      if (Number.isFinite(parsed) && parsed > 0) {
        input.value = formatCurrency(parsed);
      }
    });
  });
}

async function refreshData() {
  const [summary, expenses, goal, account, analytics] = await Promise.all([
    api.getSummary(),
    api.getExpenses(),
    api.getGoal(),
    api.getAccount(),
    api.getAnalytics()
  ]);
  setState({ summary, expenses, goal, account, analytics });
  renderDashboard();
  renderAccount();
  renderHistory();
  renderGoal();
  renderAnalytics();
}

function getExpensePayload(formData) {
  return {
    amount: parseCurrencyInput(formData.get("amount")),
    categoryId: Number(formData.get("categoryId")),
    description: String(formData.get("description") || "").trim(),
    date: String(formData.get("date") || "").trim(),
    paymentMethod: String(formData.get("paymentMethod") || "").trim(),
    note: String(formData.get("note") || "").trim()
  };
}

function bindForms() {
  $("#expenseForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = getExpensePayload(formData);
    try {
      await api.createExpense(payload);
      event.currentTarget.reset();
      $("#dateInput").value = getTodayDate();
      await refreshData();
      showTab("dashboard");
    } catch (error) {
      alert(error.message);
    }
  });

  $("#goalForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = Number($("#goalInput").value);
    try {
      const goal = await api.updateGoal(value);
      setState({ goal });
      renderGoal();
    } catch (error) {
      alert(error.message);
    }
  });

  $("#accountForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = Number($("#accountStartingBalanceInput").value);
    try {
      const account = await api.updateAccount(value);
      setState({ account });
      renderAccount();
      renderDashboard();
    } catch (error) {
      alert(error.message);
    }
  });

  $("#editExpenseForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = Number($("#editId").value);
    const payload = {
      amount: parseCurrencyInput($("#editAmount").value),
      categoryId: Number($("#editCategory").value),
      description: $("#editDescription").value.trim(),
      date: $("#editDate").value,
      paymentMethod: $("#editPayment").value.trim(),
      note: $("#editNote").value.trim()
    };
    try {
      await api.updateExpense(id, payload);
      closeEditModal();
      await refreshData();
    } catch (error) {
      alert(error.message);
    }
  });
}

function openEditModal(expense) {
  modalLastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  $("#editId").value = expense.id;
  $("#editAmount").value = formatCurrency(expense.amount);
  $("#editCategory").value = expense.categoryId;
  $("#editDescription").value = expense.description;
  $("#editDate").value = expense.date;
  $("#editPayment").value = expense.paymentMethod;
  $("#editNote").value = expense.note || "";
  const editModal = $("#editModal");
  editModal.classList.remove("hidden");
  editModal.setAttribute("aria-hidden", "false");
  $("#editAmount").focus();
}

function closeEditModal() {
  const editModal = $("#editModal");
  if (editModal.classList.contains("hidden")) return;
  editModal.classList.add("hidden");
  editModal.setAttribute("aria-hidden", "true");
  if (modalLastFocusedElement && document.contains(modalLastFocusedElement)) {
    modalLastFocusedElement.focus();
  }
}

function bindHistoryActions() {
  $("#historyTableBody").addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === "edit") {
      const expense = state.expenses.find((item) => item.id === id);
      if (expense) openEditModal(expense);
      return;
    }
    if (!confirm("Deseja excluir este gasto?")) return;
    try {
      await api.deleteExpense(id);
      await refreshData();
    } catch (error) {
      alert(error.message);
    }
  });

  ["#filterCategory", "#filterStartDate", "#filterEndDate", "#filterSearch", "#filterSort"].forEach((selector) => {
    $(selector).addEventListener("input", renderHistory);
    $(selector).addEventListener("change", renderHistory);
  });
}

function bindModal() {
  const editModal = $("#editModal");
  $("#closeEditModal").addEventListener("click", closeEditModal);
  editModal.addEventListener("click", (event) => {
    if (event.target.id === "editModal") closeEditModal();
  });
  editModal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeEditModal();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = [...editModal.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
      .filter((element) => !element.disabled && element.offsetParent !== null);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

async function init() {
  $("#motivationText").textContent = motivationTexts[Math.floor(Math.random() * motivationTexts.length)];
  $("#dateInput").value = getTodayDate();
  bindTabs();
  bindAmountFormatting();
  bindQuickActions();
  bindForms();
  bindHistoryActions();
  bindModal();
  bindAssistant();

  try {
    const categories = await api.getCategories();
    setState({ categories });
    renderCategories();
    renderCategoryChips();
    await refreshData();
  } catch (error) {
    alert(`Falha ao carregar dados: ${error.message}`);
  }
}

init();

