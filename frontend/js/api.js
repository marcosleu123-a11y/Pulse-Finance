const headers = { "Content-Type": "application/json" };

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Erro de comunicação com a API.");
  }
  return response.json();
}

export const api = {
  getCategories() {
    return request("/api/categories");
  },
  getSummary() {
    return request("/api/summary");
  },
  getExpenses() {
    return request("/api/expenses");
  },
  createExpense(payload) {
    return request("/api/expenses", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
  },
  updateExpense(id, payload) {
    return request(`/api/expenses/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload)
    });
  },
  deleteExpense(id) {
    return request(`/api/expenses/${id}`, { method: "DELETE" });
  },
  getGoal() {
    return request("/api/goal");
  },
  updateGoal(monthlyGoal) {
    return request("/api/goal", {
      method: "PUT",
      headers,
      body: JSON.stringify({ monthlyGoal })
    });
  },
  getAccount() {
    return request("/api/account");
  },
  updateAccount(accountStartingBalance) {
    return request("/api/account", {
      method: "PUT",
      headers,
      body: JSON.stringify({ accountStartingBalance })
    });
  },
  getAnalytics() {
    return request("/api/analytics");
  },
  chatWithAgent(message, sessionId = "default") {
    return request("/api/agent/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({ message, sessionId })
    });
  },
  clearAgentSession(sessionId = "default") {
    return request(`/api/agent/session/${encodeURIComponent(sessionId)}`, {
      method: "DELETE"
    });
  }
};
