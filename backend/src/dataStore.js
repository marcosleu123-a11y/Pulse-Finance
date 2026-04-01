const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

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

function getDateOffset(days) {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString().slice(0, 10);
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

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await saveStore(createDefaultStore());
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

async function saveStore(data) {
  const payload = JSON.stringify(data, null, 2);
  await fs.writeFile(DATA_FILE, payload, "utf-8");
}

module.exports = {
  readStore,
  saveStore,
  ensureStore
};
