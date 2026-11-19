// Reports page — tab switcher (Donations/Districts/Projects), preview
// table sourced from /api/reports/*, and PDF/Excel export links.
// Session guard + navbar handled by layout-common.js.

(function () {
  const tabs = document.querySelectorAll(".report-tab");
  const filterBar = document.getElementById("filterBar");
  const summaryChips = document.getElementById("summaryChips");
  const tableHead = document.getElementById("tableHead");
  const tableBody = document.getElementById("tableBody");
  const emptyState = document.getElementById("emptyState");
  const exportPdfBtn = document.getElementById("exportPdfBtn");
  const exportExcelBtn = document.getElementById("exportExcelBtn");

  const TABS = {
    donations: {
      endpoint: "/api/reports/donations",
      filters: [
        { key: "from", label: "From", type: "date" },
        { key: "to", label: "To", type: "date" },
      ],
    },
    districts: {
      endpoint: "/api/reports/districts",
      filters: [],
    },
    projects: {
      endpoint: "/api/reports/projects",
      filters: [
        {
          key: "status", label: "Status", type: "select",
          options: ["", "Active", "Pending", "Completed", "Inactive"],
        },
      ],
    },
    logs: {
      endpoint: "/api/reports/logs",
      filters: [
        {
          key: "action", label: "Actions", type: "select",
          options: ["", "LOGIN", "LOGOUT", "PROJECT_CREATED", "PROJECT_UPDATED", "DONATION_ENTRY", "DONATION_VERIFIED", "DONATION_REJECTED", "PROFILE_UPDATED", "LOGO_UPDATED"],
          optionLabels: { LOGIN: "Login", LOGOUT: "Logout", PROJECT_CREATED: "Project Created", PROJECT_UPDATED: "Project Updated", DONATION_ENTRY: "Donation Entry", DONATION_VERIFIED: "Donation Verified", DONATION_REJECTED: "Donation Rejected", PROFILE_UPDATED: "Profile Updated", LOGO_UPDATED: "Logo Updated" },
        },
      ],
    },
  };

  let activeTab = "donations";
  let activeFilters = {};

  function renderFilterBar() {
    const config = TABS[activeTab];
    if (!config.filters.length) {
      filterBar.innerHTML = "";
      return;
    }
    filterBar.innerHTML = config.filters
      .map((f) => {
        if (f.type === "date") {
          return `<input type="date" data-filter="${f.key}" class="card rounded-lg px-3 py-2 text-sm text-[#0e2b2a] focus:outline-none focus:ring-2 focus:ring-[#d4af6a]/50" placeholder="${f.label}" />`;
        }
        if (f.type === "select") {
          return `<select data-filter="${f.key}" class="card rounded-lg px-3 py-2 text-sm text-[#0e2b2a] focus:outline-none focus:ring-2 focus:ring-[#d4af6a]/50">
            ${f.options.map((o) => `<option value="${o}">${o ? (f.optionLabels && f.optionLabels[o] ? f.optionLabels[o] : o) : "All " + f.label}</option>`).join("")}
          </select>`;
        }
        return "";
      })
      .join("");

    filterBar.querySelectorAll("[data-filter]").forEach((el) => {
      el.addEventListener("change", () => {
        activeFilters[el.getAttribute("data-filter")] = el.value;
        loadReport();
      });
    });
  }

  function buildQuery(extra = {}) {
    const params = new URLSearchParams();
    Object.entries(activeFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
    Object.entries(extra).forEach(([k, v]) => { if (v) params.set(k, v); });
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function loadReport() {
    const config = TABS[activeTab];
    try {
      const res = await fetch(config.endpoint + buildQuery());
      if (!res.ok) return;
      const data = await res.json();

      tableHead.innerHTML = data.columns
        .map((c) => `<th class="px-5 py-3 font-medium">${escapeHtml(c.label)}</th>`)
        .join("");

      if (!data.rows.length) {
        tableBody.innerHTML = "";
        emptyState.classList.remove("hidden");
      } else {
        emptyState.classList.add("hidden");
        tableBody.innerHTML = data.rows
          .map(
            (row) =>
              `<tr class="hover:bg-black/[0.02] transition-colors" style="border-bottom: 1px solid #f1ede3;">` +
              data.columns
                .map((c) => `<td class="px-5 py-3.5 text-[#3a352a]">${escapeHtml(String(row[c.key] ?? ""))}</td>`)
                .join("") +
              `</tr>`
          )
          .join("");
      }

      summaryChips.innerHTML = (data.summaryLines || [])
        .map(
          (line) =>
            `<span class="text-xs font-medium px-3 py-1.5 rounded-full" style="background: rgba(212,175,106,0.12); color: #8a6a24;">${escapeHtml(line)}</span>`
        )
        .join("");

      exportPdfBtn.href = config.endpoint + buildQuery({ format: "pdf" });
      exportExcelBtn.href = config.endpoint + buildQuery({ format: "excel" });
    } catch (err) {
      tableBody.innerHTML = "";
      emptyState.textContent = "Could not load this report.";
      emptyState.classList.remove("hidden");
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeTab = tab.getAttribute("data-tab");
      activeFilters = {};
      renderFilterBar();
      loadReport();
    });
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await WelfareLayout.init();
    if (user) {
      renderFilterBar();
      loadReport();
    }
  });
})();
