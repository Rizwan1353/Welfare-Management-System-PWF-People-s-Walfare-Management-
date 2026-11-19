// Donation review page (staff only). Lists submitted donations, lets staff
// view the uploaded payment slip, and mark each submission Verified or
// Rejected. Session guard + navbar handled by layout-common.js.

(function () {
  const PKR = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 });

  const tableBody = document.getElementById("donationsTableBody");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");

  const slipModal = document.getElementById("slipModal");
  const slipContent = document.getElementById("slipContent");

  const reviewModal = document.getElementById("reviewModal");
  const reviewModalTitle = document.getElementById("reviewModalTitle");
  const reviewModalText = document.getElementById("reviewModalText");
  const confirmReviewBtn = document.getElementById("confirmReviewBtn");
  let pendingReview = null; // { id, status }

  let allDonations = [];

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function statusPill(status) {
    const map = { pending: "status-pending", verified: "status-verified", rejected: "status-rejected" };
    const label = { pending: "Pending", verified: "Verified", rejected: "Rejected" };
    return `<span class="status-pill ${map[status] || "status-pending"}">${label[status] || status}</span>`;
  }

  function renderRows(donations) {
    if (!donations.length) {
      tableBody.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    tableBody.innerHTML = donations
      .map((d) => {
        const actions = [];
        actions.push(`<button data-slip="${d.id}" class="text-xs font-medium text-[#3a6b8a] hover:underline mr-3">View Slip</button>`);
        if (d.status === "pending") {
          actions.push(`<button data-verify="${d.id}" class="text-xs font-medium text-[#3f6b4f] hover:underline mr-3">Verify</button>`);
          actions.push(`<button data-reject="${d.id}" class="text-xs font-medium text-[#a13b3b] hover:underline">Reject</button>`);
        }
        return `
      <tr class="hover:bg-black/[0.02] transition-colors" style="border-bottom: 1px solid #f1ede3;">
        <td class="px-5 py-3.5 font-mono text-xs text-[#3a352a]">${escapeHtml(d.referenceNo)}</td>
        <td class="px-5 py-3.5 font-medium text-[#0e2b2a]">${escapeHtml(d.name)}</td>
        <td class="px-5 py-3.5 text-[#3a352a]">${escapeHtml(d.senderAccountNumber || "—")}</td>
        <td class="px-5 py-3.5 text-[#3a352a]">${PKR.format(d.amount)}</td>
        <td class="px-5 py-3.5 text-[#3a352a]">${escapeHtml(d.method)}</td>
        <td class="px-5 py-3.5">${statusPill(d.status || "pending")}</td>
        <td class="px-5 py-3.5 text-right whitespace-nowrap">${actions.join("")}</td>
      </tr>`;
      })
      .join("");
  }

  async function loadDonations() {
    try {
      const params = new URLSearchParams();
      if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
      if (statusFilter.value) params.set("status", statusFilter.value);
      const qs = params.toString();

      const res = await fetch(`/api/donations${qs ? "?" + qs : ""}`);
      if (!res.ok) return;
      const data = await res.json();
      allDonations = data.donations;
      renderRows(allDonations);
    } catch (err) {
      tableBody.innerHTML = "";
      emptyState.textContent = "Could not load donations.";
      emptyState.classList.remove("hidden");
    }
  }

  let searchTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadDonations, 250);
  });
  statusFilter.addEventListener("change", loadDonations);

  // ---- Slip viewer ----
  function openSlipModal(donation) {
    if (!donation.slipFilename) {
      slipContent.innerHTML = `<div class="p-8 text-center text-sm text-[#7a7462]">No payment slip on file for this submission.</div>`;
    } else {
      const url = `/api/donations/${donation.id}/slip`;
      const isPdf = donation.slipFilename.toLowerCase().endsWith(".pdf");
      slipContent.innerHTML = isPdf
        ? `<iframe src="${url}" class="w-full" style="height: 60vh; border: 0;"></iframe>`
        : `<img src="${url}" alt="Payment slip" class="w-full h-auto" />`;
    }
    slipModal.classList.remove("hidden");
  }
  document.getElementById("closeSlipModalBtn").addEventListener("click", () => slipModal.classList.add("hidden"));
  slipModal.addEventListener("click", (e) => { if (e.target === slipModal) slipModal.classList.add("hidden"); });

  // ---- Verify / Reject ----
  function openReviewModal(id, status) {
    const donation = allDonations.find((d) => d.id === id);
    if (!donation) return;
    pendingReview = { id, status };

    if (status === "verified") {
      reviewModalTitle.textContent = "Verify donation?";
      reviewModalText.textContent = `Confirm you've checked the slip and Rs ${donation.amount} was really received from ${donation.name}.`;
      confirmReviewBtn.className = "flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors bg-[#3f6b4f] hover:bg-[#345a41]";
      confirmReviewBtn.textContent = "Verify";
    } else {
      reviewModalTitle.textContent = "Reject submission?";
      reviewModalText.textContent = `Mark this submission from ${donation.name} as rejected — use this if the slip doesn't match or looks invalid.`;
      confirmReviewBtn.className = "flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors bg-[#a13b3b] hover:bg-[#8f3232]";
      confirmReviewBtn.textContent = "Reject";
    }
    reviewModal.classList.remove("hidden");
  }
  document.getElementById("cancelReviewBtn").addEventListener("click", () => {
    pendingReview = null;
    reviewModal.classList.add("hidden");
  });

  confirmReviewBtn.addEventListener("click", async () => {
    if (!pendingReview) return;
    try {
      await fetch(`/api/donations/${pendingReview.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pendingReview.status }),
      });
    } finally {
      pendingReview = null;
      reviewModal.classList.add("hidden");
      loadDonations();
    }
  });

  tableBody.addEventListener("click", (e) => {
    const slipId = e.target.getAttribute("data-slip");
    const verifyId = e.target.getAttribute("data-verify");
    const rejectId = e.target.getAttribute("data-reject");

    if (slipId) {
      const donation = allDonations.find((d) => d.id === slipId);
      if (donation) openSlipModal(donation);
    }
    if (verifyId) openReviewModal(verifyId, "verified");
    if (rejectId) openReviewModal(rejectId, "rejected");
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await WelfareLayout.init();
    if (user) loadDonations();
  });
})();
