// Dashboard page — widgets and charts. Session guard, navbar dropdowns,
// sidebar toggle, and logout are handled by layout-common.js (WelfareLayout.init()).

(function () {
  const PKR = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 });

  function renderWidgets(widgets) {
    document.getElementById("widgetDistricts").textContent = widgets.totalDistricts;
    document.getElementById("widgetProjects").textContent = widgets.activeProjects;
    document.getElementById("widgetDonations").textContent = PKR.format(widgets.totalDonations);
    document.getElementById("widgetPending").textContent = widgets.pendingApprovals;
  }

  function renderCharts(donationTrend, projectsByStatus) {
    const trendCtx = document.getElementById("donationTrendChart");
    new Chart(trendCtx, {
      type: "line",
      data: {
        labels: donationTrend.length ? donationTrend.map((d) => d.day.slice(5)) : ["No data"],
        datasets: [
          {
            label: "Donations (PKR)",
            data: donationTrend.length ? donationTrend.map((d) => d.amount) : [0],
            borderColor: "#c99a4a",
            backgroundColor: "rgba(201,154,74,0.12)",
            tension: 0.35,
            fill: true,
            pointBackgroundColor: "#c99a4a",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: "#ece7db" } },
          x: { grid: { display: false } },
        },
      },
    });

    const statusLabels = Object.keys(projectsByStatus);
    const statusCtx = document.getElementById("projectsStatusChart");
    const palette = { Active: "#3f6b4f", Pending: "#c99a4a", Completed: "#3a6b8a", Inactive: "#a1503b" };
    new Chart(statusCtx, {
      type: "doughnut",
      data: {
        labels: statusLabels.length ? statusLabels : ["No data"],
        datasets: [
          {
            data: statusLabels.length ? statusLabels.map((s) => projectsByStatus[s]) : [1],
            backgroundColor: statusLabels.length ? statusLabels.map((s) => palette[s] || "#7a7462") : ["#ece7db"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
      },
    });
  }

  async function loadSummary() {
    try {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) return;
      const data = await res.json();
      renderWidgets(data.widgets);
      renderCharts(data.donationTrend, data.projectsByStatus);
    } catch (err) {
      // widgets stay at "—" if this fails; page remains usable
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await WelfareLayout.init();
    if (user) loadSummary();
  });
})();
