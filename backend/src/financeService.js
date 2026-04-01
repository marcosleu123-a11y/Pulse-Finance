function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDate(dateStr, dateObj) {
  return dateStr === dateObj.toISOString().slice(0, 10);
}

function isInWeek(dateStr, now) {
  const date = new Date(`${dateStr}T00:00:00`);
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date >= start && date < end;
}

function isInMonth(dateStr, now) {
  const date = new Date(`${dateStr}T00:00:00`);
  return (
    date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  );
}

function sum(list) {
  return Number(list.reduce((acc, item) => acc + Number(item.amount || 0), 0).toFixed(2));
}

function getTopCategory(expenses, categories) {
  if (!expenses.length) return null;
  const map = new Map();
  for (const expense of expenses) {
    map.set(expense.categoryId, (map.get(expense.categoryId) || 0) + expense.amount);
  }
  const [categoryId, value] = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
  const category = categories.find((c) => c.id === categoryId);
  return {
    categoryId,
    name: category ? category.name : "Outros",
    total: Number(value.toFixed(2))
  };
}

function getCategoryChart(expenses, categories) {
  return categories
    .map((category) => {
      const total = sum(expenses.filter((e) => e.categoryId === category.id));
      return { category: category.name, icon: category.icon, total };
    })
    .filter((item) => item.total > 0);
}

function getPeriodChart(expenses, days = 14) {
  const points = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const dayTotal = sum(expenses.filter((e) => e.date === key));
    points.push({
      date: key,
      total: dayTotal
    });
  }
  return points;
}

function getWeeklyCategoryTotals(expenses, categories, now = new Date()) {
  const startThisWeek = startOfWeek(now);
  const startLastWeek = new Date(startThisWeek);
  startLastWeek.setDate(startLastWeek.getDate() - 7);

  const endLastWeek = new Date(startThisWeek);
  const endThisWeek = new Date(startThisWeek);
  endThisWeek.setDate(endThisWeek.getDate() + 7);

  const byCategory = categories.map((category) => {
    const thisWeek = sum(
      expenses.filter((e) => {
        const d = new Date(`${e.date}T00:00:00`);
        return d >= startThisWeek && d < endThisWeek && e.categoryId === category.id;
      })
    );
    const lastWeek = sum(
      expenses.filter((e) => {
        const d = new Date(`${e.date}T00:00:00`);
        return d >= startLastWeek && d < endLastWeek && e.categoryId === category.id;
      })
    );
    return {
      category: category.name,
      thisWeek,
      lastWeek,
      delta: Number((thisWeek - lastWeek).toFixed(2))
    };
  });

  return byCategory;
}

function getSummary(data) {
  const { expenses, categories } = data;
  const now = new Date();

  const todayExpenses = expenses.filter((e) => isSameDate(e.date, now));
  const weekExpenses = expenses.filter((e) => isInWeek(e.date, now));
  const monthExpenses = expenses.filter((e) => isInMonth(e.date, now));

  const totalToday = sum(todayExpenses);
  const totalWeek = sum(weekExpenses);
  const totalMonth = sum(monthExpenses);
  const topCategory = getTopCategory(monthExpenses, categories);

  const categoryChart = getCategoryChart(monthExpenses, categories);
  const periodChart = getPeriodChart(expenses, 14);
  const weeklyComparison = getWeeklyCategoryTotals(expenses, categories, now);

  return {
    totalToday,
    totalWeek,
    totalMonth,
    totalRecords: expenses.length,
    topCategory,
    recentExpenses: [...expenses]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
      .slice(0, 8),
    categoryChart,
    periodChart,
    weeklyComparison
  };
}

function getGoalStatus(monthlyGoal, totalMonth) {
  if (!monthlyGoal || monthlyGoal <= 0) {
    return {
      monthlyGoal: 0,
      totalMonth,
      remaining: 0,
      percent: 0,
      status: "neutral"
    };
  }

  const remaining = Number((monthlyGoal - totalMonth).toFixed(2));
  const percent = Number(((totalMonth / monthlyGoal) * 100).toFixed(1));
  let status = "ok";

  if (percent >= 100) status = "danger";
  else if (percent >= 85) status = "warn";

  return {
    monthlyGoal,
    totalMonth,
    remaining,
    percent,
    status
  };
}

function getAccountStatus(accountStartingBalance, totalMonth, totalToday) {
  const base = Number(accountStartingBalance || 0);
  const currentBalance = Number((base - totalMonth).toFixed(2));
  const spentPercent = base > 0 ? Number(((totalMonth / base) * 100).toFixed(1)) : 0;

  return {
    accountStartingBalance: base,
    spentThisMonth: totalMonth,
    spentToday: totalToday,
    currentBalance,
    spentPercent
  };
}

function getInsights(summary) {
  const { topCategory, weeklyComparison } = summary;
  const highlights = [];

  if (topCategory) {
    highlights.push(`Seu maior gasto do mês foi em ${topCategory.name.toLowerCase()}.`);
  }

  const biggestIncrease = [...weeklyComparison].sort((a, b) => b.delta - a.delta)[0];
  if (biggestIncrease && biggestIncrease.delta > 0) {
    highlights.push(
      `${biggestIncrease.category} aumentou ${biggestIncrease.delta.toFixed(2)} em relação à semana passada.`
    );
  } else {
    highlights.push("Nenhuma categoria aumentou em relação à semana passada.");
  }

  if (summary.totalMonth <= 500) {
    highlights.push("Seu ritmo mensal está controlado até aqui.");
  } else if (summary.totalMonth <= 1500) {
    highlights.push("Você está em um nível estável de gastos no mês.");
  } else {
    highlights.push("Vale revisar categorias com maior impacto para fechar o mês mais leve.");
  }

  return highlights;
}

module.exports = {
  getSummary,
  getGoalStatus,
  getAccountStatus,
  getInsights
};
