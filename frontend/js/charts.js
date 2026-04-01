let dashboardCategoryChart;
let dashboardPeriodChart;
let analyticsPieChart;
let analyticsBarChart;

const chartTheme = {
  ticks: { color: "#9ab0c2" },
  grid: { color: "rgba(154,176,194,0.14)" }
};

function destroyIfExists(chart) {
  if (chart) chart.destroy();
}

export function renderDashboardCharts(summary) {
  const categoryCtx = document.getElementById("dashboardCategoryChart");
  const periodCtx = document.getElementById("dashboardPeriodChart");
  destroyIfExists(dashboardCategoryChart);
  destroyIfExists(dashboardPeriodChart);

  dashboardCategoryChart = new Chart(categoryCtx, {
    type: "doughnut",
    data: {
      labels: summary.categoryChart.map((i) => i.category),
      datasets: [
        {
          data: summary.categoryChart.map((i) => i.total),
          backgroundColor: ["#45f0b4", "#48b8ff", "#7dd3fc", "#f59e0b", "#c084fc", "#22d3ee", "#f97316", "#94a3b8"]
        }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: "#e8f2fb" } } }
    }
  });

  dashboardPeriodChart = new Chart(periodCtx, {
    type: "line",
    data: {
      labels: summary.periodChart.map((i) => i.date.slice(5)),
      datasets: [
        {
          label: "Gastos",
          data: summary.periodChart.map((i) => i.total),
          borderColor: "#48b8ff",
          backgroundColor: "rgba(72,184,255,0.16)",
          fill: true,
          tension: 0.28
        }
      ]
    },
    options: {
      scales: {
        x: chartTheme,
        y: chartTheme
      },
      plugins: { legend: { labels: { color: "#e8f2fb" } } }
    }
  });
}

export function renderAnalyticsCharts(analytics) {
  const pieCtx = document.getElementById("analyticsPieChart");
  const barCtx = document.getElementById("analyticsBarChart");
  destroyIfExists(analyticsPieChart);
  destroyIfExists(analyticsBarChart);

  analyticsPieChart = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: analytics.categoryChart.map((item) => item.category),
      datasets: [
        {
          data: analytics.categoryChart.map((item) => item.total),
          backgroundColor: ["#45f0b4", "#48b8ff", "#7dd3fc", "#f59e0b", "#c084fc", "#22d3ee", "#f97316", "#94a3b8"]
        }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: "#e8f2fb" } } }
    }
  });

  analyticsBarChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: analytics.weeklyComparison.map((c) => c.category),
      datasets: [
        {
          label: "Semana atual",
          data: analytics.weeklyComparison.map((c) => c.thisWeek),
          backgroundColor: "#45f0b4"
        },
        {
          label: "Semana passada",
          data: analytics.weeklyComparison.map((c) => c.lastWeek),
          backgroundColor: "#48b8ff"
        }
      ]
    },
    options: {
      scales: {
        x: chartTheme,
        y: chartTheme
      },
      plugins: { legend: { labels: { color: "#e8f2fb" } } }
    }
  });
}
