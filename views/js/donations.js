// Donation page — public, no login.
// Step 1: show our bank/JazzCash/EasyPaisa details (fetched from
// /api/donations/payment-info) so the donor can send money themselves.
// Step 2: collect their name, the account they paid FROM, amount, method,
// and a payment slip upload as proof — submitted to POST /api/donations
// as multipart/form-data. Nothing is auto-confirmed; staff reviews it.

(function () {
  const form = document.getElementById("donateForm");
  const nameField = document.getElementById("donorName");
  const accountField = document.getElementById("donorAccount");
  const amountField = document.getElementById("donorAmount");
  const fileField = document.getElementById("slipFile");
  const fileDrop = document.getElementById("fileDrop");
  const fileDropText = document.getElementById("fileDropText");
  const formError = document.getElementById("formError");
  const donateBtn = document.getElementById("donateBtn");
  const donateBtnText = document.getElementById("donateBtnText");
  const backLink = document.getElementById("backLink");

  const methodCards = document.querySelectorAll(".method-card");
  methodCards.forEach((card) => {
    card.addEventListener("click", () => {
      methodCards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      card.querySelector('input[type="radio"]').checked = true;
    });
  });

  // ---- Payment details (Step 1) ----
  function copyRow(value, btn) {
    navigator.clipboard?.writeText(value).then(() => {
      const original = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => { btn.textContent = original; }, 1500);
    });
  }

  function renderPaymentDetails(details) {
    const loading = document.getElementById("paymentDetailsLoading");
    const list = document.getElementById("paymentDetailsList");
    const errorEl = document.getElementById("paymentDetailsError");

    const blocks = [];

    if (details.bank && details.bank.accountNumber && !details.bank.accountNumber.includes("REPLACE_WITH")) {
      blocks.push({
        label: "Bank Transfer",
        rows: [
          ["Account Title", details.bank.accountTitle],
          ["Account Number", details.bank.accountNumber],
          ["IBAN", details.bank.iban],
          ["Bank", details.bank.bankName],
        ],
      });
    }
    if (details.jazzcash && details.jazzcash.number && !details.jazzcash.number.includes("REPLACE_WITH")) {
      blocks.push({
        label: "JazzCash",
        rows: [
          ["Account Title", details.jazzcash.accountTitle],
          ["Number", details.jazzcash.number],
        ],
      });
    }
    if (details.easypaisa && details.easypaisa.number && !details.easypaisa.number.includes("REPLACE_WITH")) {
      blocks.push({
        label: "EasyPaisa",
        rows: [
          ["Account Title", details.easypaisa.accountTitle],
          ["Number", details.easypaisa.number],
        ],
      });
    }

    loading.classList.add("hidden");

    if (!blocks.length) {
      errorEl.classList.remove("hidden");
      return;
    }

    list.innerHTML = blocks
      .map(
        (block) => `
      <div>
        <div class="text-xs font-semibold text-[#d4af6a] uppercase tracking-wide mb-2">${block.label}</div>
        <div class="rounded-lg overflow-hidden" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);">
          ${block.rows
            .filter(([, v]) => v)
            .map(
              ([label, value]) => `
            <div class="pay-detail-row flex items-center justify-between px-3 py-2.5">
              <div>
                <div class="text-[10px] text-white/40 uppercase tracking-wide">${label}</div>
                <div class="text-sm text-white/90 font-medium">${value}</div>
              </div>
              <button type="button" class="copy-btn text-xs text-white/40 hover:text-[#d4af6a]" data-copy="${value}">Copy</button>
            </div>`
            )
            .join("")}
        </div>
      </div>`
      )
      .join("");
    list.classList.remove("hidden");

    list.querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", () => copyRow(btn.getAttribute("data-copy"), btn));
    });
  }

  async function loadPaymentDetails() {
    try {
      const res = await fetch("/api/donations/payment-info");
      const data = await res.json();
      if (!res.ok) throw new Error();
      renderPaymentDetails(data.paymentDetails || {});
    } catch (err) {
      document.getElementById("paymentDetailsLoading").classList.add("hidden");
      document.getElementById("paymentDetailsError").classList.remove("hidden");
    }
  }

  // ---- File picker ----
  fileField.addEventListener("change", () => {
    if (fileField.files && fileField.files[0]) {
      fileDropText.textContent = fileField.files[0].name;
      fileDrop.classList.add("drag-over");
    } else {
      fileDropText.textContent = "Tap to upload a photo or screenshot (JPG, PNG, PDF — max 5MB)";
      fileDrop.classList.remove("drag-over");
    }
  });

  // ---- Submit (Step 2) ----
  function showError(message) {
    formError.textContent = message;
    formError.classList.remove("hidden");
  }
  function hideError() {
    formError.classList.add("hidden");
  }
  function setLoading(isLoading) {
    donateBtn.disabled = isLoading;
    donateBtnText.textContent = isLoading ? "Submitting…" : "Submit for Review";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const name = nameField.value.trim();
    const account = accountField.value.trim();
    const amount = amountField.value;
    const methodInput = document.querySelector('input[name="method"]:checked');
    const file = fileField.files[0];

    if (!name || !account || !amount) {
      showError("Please fill in your name, account number, and amount.");
      return;
    }
    if (!methodInput) {
      showError("Please select which method you paid with.");
      return;
    }
    if (!file) {
      showError("Please upload your payment slip or screenshot.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("senderAccountNumber", account);
    formData.append("amount", amount);
    formData.append("method", methodInput.value);
    formData.append("slip", file);

    setLoading(true);
    try {
      const res = await fetch("/api/donations", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      const receiptParams = new URLSearchParams({
        ref: data.donation.referenceNo,
        amount: data.donation.amount,
        date: data.donation.createdAt,
        status: data.donation.status,
      });
      window.location.href = `/donation-success.html?${receiptParams.toString()}`;
    } catch (err) {
      showError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  });

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
    loadPaymentDetails();
    checkStaffSession();
  });
})();
