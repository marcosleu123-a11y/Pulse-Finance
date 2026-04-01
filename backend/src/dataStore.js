const fs = require("fs/promises");
const path = require("path");

const IS_VERCEL = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const DEFAULT_FILE_PATH = IS_VERCEL
  ? path.join("/tmp", "pulse-finance-store.json")
  : path.join(__dirname, "..", "data", "store.json");
const DATA_FILE = process.env.DATA_FILE_PATH ? path.resolve(process.env.DATA_FILE_PATH) : DEFAULT_FILE_PATH;
const DATA_DIR = path.dirname(DATA_FILE);

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Uber / Transporte", icon: "🚕" },
  { id: 2, name: "Mercado", icon: "🛒" },
  { id: 3, name: "Alimentação", icon: "🍽️" },
  { id: 4, name: "Lazer", icon: "🎬" },
  { id: 5, name: "Contas", icon: "💡" },
  { id: 6, name: "Saúde", icon: "🩺" },
  { id: 7, name: "Compras", icon: "🛍️" },
  { id: 8, name: "Outros", icon: "📦" }
];

let useMemoryStore = false;
let memoryStore = null;
let warnedAboutMemoryFallback = false;

function getDateOffset(days) {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString().slice(0, 10);
}

function cloneStore(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDefaultStore() {
  return {
    nextExpenseId: 7,
    settings: {
      monthlyGoal: 2200,
      accountStartingBalance: 3500
    },
    categories: DEFAULT_CATEGORIES,
    expenses: [
      {
        id: 1,
        amount: 12.4,
        categoryId: 1,
        description: "Uber para trabalho",
        date: getDateOffset(0),
        paymentMethod: "Cartão",
        note: ""
      },
      {
        id: 2,
        amount: 34.9,
        categoryId: 3,
        description: "Almoço no centro",
        date: getDateOffset(0),
        paymentMethod: "Cartão",
        note: ""
      },
      {
        id: 3,
        amount: 65.2,
        categoryId: 2,
        description: "Compras rápidas de mercado",
        date: getDateOffset(-1),
        paymentMethod: "Pix",
        note: ""
      },
      {
        id: 4,
        amount: 18,
        categoryId: 1,
        description: "Metrô e ônibus",
        date: getDateOffset(-3),
        paymentMethod: "Débito",
        note: ""
      },
      {
        id: 5,
        amount: 89.99,
        categoryId: 7,
        description: "Itens de casa",
        date: getDateOffset(-5),
        paymentMethod: "Crédito",
        note: ""
      },
      {
        id: 6,
        amount: 120,
        categoryId: 5,
        description: "Conta de internet",
        date: getDateOffset(-6),
        paymentMethod: "Débito",
        note: ""
      }
    ]
  };
}

function isReadOnlyFsError(error) {
  if (!error || !error.code) return false;
  return error.code === "EROFS" || error.code === "EACCES" || error.code === "EPERM";
}

function activateMemoryFallback(reasonError, seedData = null) {
  useMemoryStore = true;
  if (!memoryStore) {
    memoryStore = cloneStore(seedData || createDefaultStore());
  } else if (seedData) {
    memoryStore = cloneStore(seedData);
  }

  if (!warnedAboutMemoryFallback) {
    warnedAboutMemoryFallback = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[dataStore] Persistencia em arquivo indisponivel (${reasonError.code || "erro"}). `
        + "Usando memoria em runtime. Para persistencia real em producao, configure DATA_FILE_PATH em "
        + "um volume gravavel ou use banco externo."
    );
  }
}

async function ensureStore() {
  if (useMemoryStore) return;

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE);
  } catch (error) {
    if (isReadOnlyFsError(error)) {
      activateMemoryFallback(error);
      return;
    }

    if (error && error.code !== "ENOENT") {
      throw error;
    }

    const fallbackData = createDefaultStore();
    await saveStore(fallbackData);
  }
}

async function readStore() {
  if (useMemoryStore) {
    if (!memoryStore) memoryStore = createDefaultStore();
    return cloneStore(memoryStore);
  }

  await ensureStore();
  if (useMemoryStore) {
    return cloneStore(memoryStore || createDefaultStore());
  }

  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (isReadOnlyFsError(error)) {
      activateMemoryFallback(error);
      return cloneStore(memoryStore);
    }

    if (error && error.code === "ENOENT") {
      const fallbackData = createDefaultStore();
      await saveStore(fallbackData);
      return cloneStore(fallbackData);
    }

    throw error;
  }
}

async function saveStore(data) {
  const snapshot = cloneStore(data);

  if (useMemoryStore) {
    memoryStore = snapshot;
    return;
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const payload = JSON.stringify(snapshot, null, 2);
    await fs.writeFile(DATA_FILE, payload, "utf-8");
  } catch (error) {
    if (isReadOnlyFsError(error)) {
      activateMemoryFallback(error, snapshot);
      return;
    }
    throw error;
  }
}

module.exports = {
  readStore,
  saveStore,
  ensureStore
};
