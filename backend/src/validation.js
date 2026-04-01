function parseCurrencyValue(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  const normalized = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  return Number(normalized);
}

function validateExpense(payload, categories) {
  const amount = parseCurrencyValue(payload.amount);
  const categoryId = Number(payload.categoryId);
  const description = String(payload.description || "").trim();
  const date = String(payload.date || "").trim();
  const paymentMethod = String(payload.paymentMethod || "").trim();
  const note = String(payload.note || "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: "Valor inválido." };
  }
  if (!Number.isInteger(categoryId) || !categories.some((c) => c.id === categoryId)) {
    return { valid: false, error: "Categoria inválida." };
  }
  if (!description) {
    return { valid: false, error: "Descrição é obrigatória." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { valid: false, error: "Data inválida." };
  }
  if (!paymentMethod) {
    return { valid: false, error: "Forma de pagamento é obrigatória." };
  }

  return {
    valid: true,
    expense: {
      amount: Number(amount.toFixed(2)),
      categoryId,
      description,
      date,
      paymentMethod,
      note
    }
  };
}

module.exports = {
  validateExpense
};
