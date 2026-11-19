// Donation success / receipt page — reads reference number, amount, and
// date from the URL query string (set by donate.html right after a
// successful submission) and displays them. No backend lookup is used
// here on purpose: this page is public and a lookup-by-id endpoint would
// let anyone enumerate other donors' details, so the receipt is only
// ever shown using the data from the donation that was just made.

(function () {
  const PKR = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 });

  const receiptView = document.getElementById("receiptView");
  const fallbackView = document.getElementById("fallbackView");
  const backLink = document.getElementById("backLink");

  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-GB", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  function statusBadge(status) {
    const map = {
      pending: { text: "Pending Verification", bg: "rgba(212,175,106,0.16)", color: "#d4af6a" },
      verified: { text: "Verified", bg: "rgba(63,168,120,0.16)", color: "#5fbf8e" },
      rejected: { text: "Rejected", bg: "rgba(161,80,59,0.18)", color: "#e08a72" },
    };
    return map[status] || map.pending;
  }

  function init() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const amount = params.get("amount");
    const date = params.get("date");
    const status = params.get("status") || "pending";

    if (!ref || !amount) {
      fallbackView.classList.remove("hidden");
      return;
    }

    document.getElementById("refNumber").textContent = ref;
    document.getElementById("refAmount").textContent = PKR.format(Number(amount));
    document.getElementById("refDate").textContent = formatDate(date || new Date().toISOString());

    const badge = statusBadge(status);
    const badgeEl = document.getElementById("refStatus");
    badgeEl.textContent = badge.text;
    badgeEl.style.background = badge.bg;
    badgeEl.style.color = badge.color;

    receiptView.classList.remove("hidden");
  }

  async function checkStaffSession() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        backLink.textContent = "Back to Dashboard";
        backLink.href = "/dashboard.html";
      }
    } catch (err) {
      // stay on default "Staff Login" link
    } finally {
      backLink.classList.remove("hidden");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    init();
    checkStaffSession();
  });
})();
