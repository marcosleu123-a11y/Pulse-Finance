const { spawn } = require("child_process");
const { readStore } = require("./dataStore");
const { getSummary, getGoalStatus, getAccountStatus } = require("./financeService");

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gpt-oss:20b-cloud";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 45000);
const OLLAMA_PULL_TIMEOUT_MS = Number(process.env.OLLAMA_PULL_TIMEOUT_MS || 120000);
const OLLAMA_READY_TIMEOUT_MS = Number(process.env.OLLAMA_READY_TIMEOUT_MS || 20000);
const OLLAMA_AUTO_START = process.env.OLLAMA_AUTO_START !== "false";
const OLLAMA_SKIP_MODEL_CHECK = process.env.OLLAMA_SKIP_MODEL_CHECK === "true";
const MAX_TOOL_LOOPS = 4;
const MAX_SESSION_MESSAGES = 12;

const sessionHistory = new Map();
let ensureOllamaPromise = null;

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "get_summary",
      description: "Retorna resumo financeiro atual (hoje, semana e mes).",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_goal_status",
      description: "Retorna status da meta mensal.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_account_status",
      description: "Retorna status da conta com saldo atual.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_expenses",
      description: "Lista gastos recentes com filtros opcionais.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            description: "Quantidade maxima de gastos (1 ate 20)."
          },
          categoryId: {
            type: "integer",
            description: "Filtra por categoria."
          },
          startDate: {
            type: "string",
            description: "Data inicial no formato YYYY-MM-DD."
          },
          endDate: {
            type: "string",
            description: "Data final no formato YYYY-MM-DD."
          },
          q: {
            type: "string",
            description: "Texto para buscar na descricao."
          }
        }
      }
    }
  }
];

const SYSTEM_PROMPT = `
Voce e um assistente financeiro do projeto Pulse Finance.
Regras:
- Responda sempre em portugues do Brasil.
- Quando a pergunta depender de dados reais do app, use ferramentas.
- Nunca invente valores ou registros.
- Seja objetivo e util.
- Se faltar informacao, diga claramente.
`;

function normalizeSettings(settings = {}) {
  return {
    monthlyGoal: Number.isFinite(Number(settings.monthlyGoal)) ? Number(settings.monthlyGoal) : 0,
    accountStartingBalance: Number.isFinite(Number(settings.accountStartingBalance))
      ? Number(settings.accountStartingBalance)
      : 0
  };
}

function getHistory(sessionId) {
  return sessionHistory.get(sessionId) || [];
}

function appendHistory(sessionId, messages) {
  const current = getHistory(sessionId);
  const merged = [...current, ...messages];
  sessionHistory.set(sessionId, merged.slice(-MAX_SESSION_MESSAGES));
}

function clearAgentSession(sessionId) {
  sessionHistory.delete(sessionId);
}

function parseToolArguments(rawArguments) {
  if (!rawArguments) return {};
  if (typeof rawArguments === "object") return rawArguments;
  if (typeof rawArguments !== "string") return {};

  try {
    return JSON.parse(rawArguments);
  } catch {
    return {};
  }
}

function toInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return parsed;
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

async function toolGetSummary() {
  const store = await readStore();
  const summary = getSummary(store);
  return {
    totalToday: summary.totalToday,
    totalWeek: summary.totalWeek,
    totalMonth: summary.totalMonth,
    totalRecords: summary.totalRecords,
    topCategory: summary.topCategory
  };
}

async function toolGetGoalStatus() {
  const store = await readStore();
  store.settings = normalizeSettings(store.settings);
  const summary = getSummary(store);
  return getGoalStatus(store.settings.monthlyGoal || 0, summary.totalMonth);
}

async function toolGetAccountStatus() {
  const store = await readStore();
  store.settings = normalizeSettings(store.settings);
  const summary = getSummary(store);
  return getAccountStatus(
    store.settings.accountStartingBalance,
    summary.totalMonth,
    summary.totalToday
  );
}

function enrichExpense(expense, categoryMap) {
  const category = categoryMap.get(expense.categoryId);
  return {
    id: expense.id,
    amount: expense.amount,
    categoryId: expense.categoryId,
    categoryName: category ? category.name : "Outros",
    description: expense.description,
    date: expense.date,
    paymentMethod: expense.paymentMethod,
    note: expense.note || ""
  };
}

async function toolListExpenses(args = {}) {
  const store = await readStore();
  const categoryMap = new Map(store.categories.map((category) => [category.id, category]));
  const limit = Math.min(Math.max(toInteger(args.limit, 5), 1), 20);
  const categoryId = toInteger(args.categoryId, null);
  const query = String(args.q || "").trim().toLowerCase();
  const startDate = isIsoDate(args.startDate) ? String(args.startDate) : "";
  const endDate = isIsoDate(args.endDate) ? String(args.endDate) : "";

  let filtered = [...store.expenses];

  if (categoryId !== null) {
    filtered = filtered.filter((item) => item.categoryId === categoryId);
  }
  if (startDate) {
    filtered = filtered.filter((item) => item.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((item) => item.date <= endDate);
  }
  if (query) {
    filtered = filtered.filter((item) => item.description.toLowerCase().includes(query));
  }

  const expenses = filtered
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, limit)
    .map((expense) => enrichExpense(expense, categoryMap));

  return {
    count: expenses.length,
    expenses
  };
}

const TOOL_HANDLERS = {
  get_summary: toolGetSummary,
  get_goal_status: toolGetGoalStatus,
  get_account_status: toolGetAccountStatus,
  list_expenses: toolListExpenses
};

function createToolError(name, message) {
  return {
    name: name || "unknown_tool",
    payload: {
      error: message
    }
  };
}

async function executeToolCall(toolCall) {
  const call = toolCall && toolCall.function ? toolCall.function : null;
  const name = call ? String(call.name || "") : "";
  const handler = TOOL_HANDLERS[name];

  if (!handler) {
    return createToolError(name, "Ferramenta nao encontrada.");
  }

  const args = parseToolArguments(call.arguments);
  try {
    const payload = await handler(args);
    return { name, payload };
  } catch (error) {
    return createToolError(name, error.message || "Falha ao executar ferramenta.");
  }
}

function normalizeAssistantMessage(message) {
  return {
    role: "assistant",
    content: String(message && message.content ? message.content : ""),
    tool_calls: Array.isArray(message && message.tool_calls) ? message.tool_calls : []
  };
}

function createOllamaError(userMessage, details) {
  const error = new Error(details || userMessage);
  error.statusCode = 502;
  error.userMessage = userMessage;
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getErrorCode(error) {
  if (!error) return "";
  if (error.cause && error.cause.code) return error.cause.code;
  if (error.code) return error.code;
  return "";
}

function isConnectionError(error) {
  const code = getErrorCode(error);
  return code === "ECONNREFUSED" || code === "EHOSTUNREACH" || code === "ENOTFOUND";
}

async function fetchWithTimeout(url, options = {}, timeoutMs = OLLAMA_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function startOllamaServe() {
  if (!OLLAMA_AUTO_START) return false;
  try {
    const child = spawn("ollama", ["serve"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

async function waitForOllama(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, { method: "GET" }, 3000);
      if (response.ok) return true;
    } catch (error) {
      if (!isConnectionError(error) && error.name !== "AbortError") {
        throw error;
      }
    }
    await sleep(750);
  }
  return false;
}

async function getOllamaModelNames() {
  const response = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, { method: "GET" }, 10000);
  if (!response.ok) {
    const details = await response.text();
    throw createOllamaError(
      "Nao foi possivel listar os modelos do Ollama.",
      `HTTP ${response.status}: ${details}`
    );
  }
  const payload = await response.json().catch(() => ({}));
  const models = Array.isArray(payload.models) ? payload.models : [];
  return models.flatMap((item) => [item.name, item.model].filter(Boolean));
}

async function ensureOllamaModel() {
  if (OLLAMA_SKIP_MODEL_CHECK) return;
  const names = await getOllamaModelNames();
  if (names.includes(OLLAMA_MODEL)) return;

  const pullResponse = await fetchWithTimeout(
    `${OLLAMA_BASE_URL}/api/pull`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false
      })
    },
    OLLAMA_PULL_TIMEOUT_MS
  );

  if (!pullResponse.ok) {
    const details = await pullResponse.text();
    throw createOllamaError(
      "Nao consegui baixar o modelo configurado no Ollama.",
      `HTTP ${pullResponse.status}: ${details}`
    );
  }
}

async function ensureOllamaReady() {
  if (ensureOllamaPromise) return ensureOllamaPromise;

  ensureOllamaPromise = (async () => {
    let reachable = await waitForOllama(3000);
    if (!reachable) {
      const started = startOllamaServe();
      if (!started) {
        throw createOllamaError(
          "Nao consegui conectar ao Ollama local.",
          "Servico indisponivel e auto-start desativado ou falhou."
        );
      }

      reachable = await waitForOllama(OLLAMA_READY_TIMEOUT_MS);
      if (!reachable) {
        throw createOllamaError(
          "Nao consegui iniciar o Ollama automaticamente.",
          "Timeout aguardando o servico ficar disponivel."
        );
      }
    }

    await ensureOllamaModel();
  })();

  try {
    await ensureOllamaPromise;
  } catch (error) {
    ensureOllamaPromise = null;
    throw error;
  }
}

async function callOllama(messages) {
  await ensureOllamaReady();

  try {
    const response = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages,
        tools: TOOL_DEFINITIONS
      })
    });

    if (!response.ok) {
      const details = await response.text();
      throw createOllamaError(
        "Ollama respondeu com erro. Verifique se o modelo existe e tente novamente.",
        `HTTP ${response.status}: ${details}`
      );
    }

    const payload = await response.json();
    if (!payload || !payload.message) {
      throw createOllamaError("Resposta invalida do Ollama.", "Campo 'message' ausente.");
    }

    return normalizeAssistantMessage(payload.message);
  } catch (error) {
    if (error.name === "AbortError") {
      throw createOllamaError("Tempo limite ao consultar Ollama local.", error.message);
    }

    if (error.userMessage) {
      throw error;
    }

    if (isConnectionError(error)) {
      ensureOllamaPromise = null;
      throw createOllamaError(
        "Nao consegui conectar ao Ollama local.",
        error.message
      );
    }

    throw createOllamaError("Falha inesperada ao consultar Ollama.", error.message);
  }
}

function getSessionId(rawSessionId) {
  const value = String(rawSessionId || "default").trim();
  return value || "default";
}

async function chatWithFinanceAgent({ sessionId, message }) {
  const userMessage = String(message || "").trim();
  if (!userMessage) {
    const error = new Error("Mensagem vazia.");
    error.statusCode = 400;
    error.userMessage = "Informe uma mensagem valida.";
    throw error;
  }

  const sessionKey = getSessionId(sessionId);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...getHistory(sessionKey),
    { role: "user", content: userMessage }
  ];
  const usedTools = [];
  let reply = "";

  for (let i = 0; i < MAX_TOOL_LOOPS; i += 1) {
    const assistantMessage = await callOllama(messages);
    messages.push(assistantMessage);

    const toolCalls = Array.isArray(assistantMessage.tool_calls) ? assistantMessage.tool_calls : [];
    if (!toolCalls.length) {
      reply = assistantMessage.content.trim();
      break;
    }

    for (const toolCall of toolCalls) {
      const result = await executeToolCall(toolCall);
      usedTools.push(result.name);
      messages.push({
        role: "tool",
        name: result.name,
        tool_name: result.name,
        content: JSON.stringify(result.payload)
      });
    }
  }

  if (!reply) {
    reply = "Nao consegui concluir a resposta. Tente reformular sua pergunta.";
  }

  appendHistory(sessionKey, [
    { role: "user", content: userMessage },
    { role: "assistant", content: reply }
  ]);

  return {
    sessionId: sessionKey,
    model: OLLAMA_MODEL,
    usedTools: [...new Set(usedTools)],
    reply
  };
}

module.exports = {
  chatWithFinanceAgent,
  clearAgentSession
};
