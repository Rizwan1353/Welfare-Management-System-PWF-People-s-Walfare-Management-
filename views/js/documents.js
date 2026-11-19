// Documents page — Offer Letter (Step 11) and Certificate (Step 12)
// generators, plus tab switching between them. Session guard + navbar
// handled by layout-common.js.

(function () {
  // ---- Tabs ----
  const tabs = document.querySelectorAll(".doc-tab");
  const panels = { "offer-letter": document.getElementById("panel-offer-letter"), certificate: document.getElementById("panel-certificate") };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.getAttribute("data-doc-tab");
      Object.entries(panels).forEach(([key, el]) => el.classList.toggle("hidden", key !== target));
    });
  });

  async function downloadFromResponse(res) {
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="(.+)"/);
    const filename = match ? match[1] : "document.pdf";

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  async function loadDistrictOptions(selectEl) {
    try {
      const res = await fetch("/api/districts");
      if (!res.ok) return;
      const data = await res.json();
      selectEl.innerHTML =
        `<option value="">Select a district…</option>` +
        data.districts.map((d) => `<option value="${d.name}">${d.name}</option>`).join("");
    } catch (err) {
      // select stays with just the placeholder
    }
  }

  // ---- Offer Letter ----
  const form = document.getElementById("offerLetterForm");
  const nameField = document.getElementById("volunteerName");
  const cnicField = document.getElementById("volunteerCnic");
  const districtField = document.getElementById("volunteerDistrict");
  const joiningDateField = document.getElementById("volunteerJoiningDate");
  const formError = document.getElementById("formError");
  const generateBtn = document.getElementById("generateBtn");
  const generateBtnText = document.getElementById("generateBtnText");
  const lettersList = document.getElementById("lettersList");
  const emptyLettersState = document.getElementById("emptyLettersState");

  async function loadLetters() {
    try {
      const res = await fetch("/api/documents/offer-letters");
      if (!res.ok) return;
      const data = await res.json();

      if (!data.letters.length) {
        lettersList.innerHTML = "";
        emptyLettersState.classList.remove("hidden");
        return;
      }
      emptyLettersState.classList.add("hidden");

      lettersList.innerHTML = data.letters
        .map(
          (l) => `
        <div class="px-6 py-3.5 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm font-medium text-[#0e2b2a] truncate">${l.filename}</div>
            <div class="text-xs text-[#7a7462]">${formatDate(l.createdAt)}</div>
          </div>
          <a href="/api/documents/offer-letters/${encodeURIComponent(l.filename)}" class="text-xs font-medium text-[#3a6b8a] hover:underline shrink-0">Download</a>
        </div>`
        )
        .join("");
    } catch (err) {
      // list stays empty on failure
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.classList.add("hidden");

    const payload = {
      name: nameField.value.trim(),
      cnic: cnicField.value.trim(),
      district: districtField.value,
      joiningDate: joiningDateField.value,
    };

    generateBtn.disabled = true;
    generateBtnText.textContent = "Generating…";

    try {
      const res = await fetch("/api/documents/offer-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        formError.textContent = data.error || "Something went wrong.";
        formError.classList.remove("hidden");
        return;
      }

      await downloadFromResponse(res);
      form.reset();
      loadLetters();
    } catch (err) {
      formError.textContent = "Could not reach the server.";
      formError.classList.remove("hidden");
    } finally {
      generateBtn.disabled = false;
      generateBtnText.textContent = "Generate Offer Letter (PDF)";
    }
  });

  // ---- Certificate ----
  const certForm = document.getElementById("certificateForm");
  const certNameField = document.getElementById("certVolunteerName");
  const certNumberField = document.getElementById("certNumber");
  const certDistrictField = document.getElementById("certDistrict");
  const certFormError = document.getElementById("certFormError");
  const generateCertBtn = document.getElementById("generateCertBtn");
  const generateCertBtnText = document.getElementById("generateCertBtnText");
  const certificatesList = document.getElementById("certificatesList");
  const emptyCertificatesState = document.getElementById("emptyCertificatesState");

  async function loadCertificates() {
    try {
      const res = await fetch("/api/documents/certificates");
      if (!res.ok) return;
      const data = await res.json();

      if (!data.certificates.length) {
        certificatesList.innerHTML = "";
        emptyCertificatesState.classList.remove("hidden");
        return;
      }
      emptyCertificatesState.classList.add("hidden");

      certificatesList.innerHTML = data.certificates
        .map(
          (c) => `
        <div class="px-6 py-3.5 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm font-medium text-[#0e2b2a] truncate">${c.filename}</div>
            <div class="text-xs text-[#7a7462]">${formatDate(c.createdAt)}</div>
          </div>
          <a href="/api/documents/certificates/${encodeURIComponent(c.filename)}" class="text-xs font-medium text-[#3a6b8a] hover:underline shrink-0">Download</a>
        </div>`
        )
        .join("");
    } catch (err) {
      // list stays empty on failure
    }
  }

  certForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    certFormError.classList.add("hidden");

    const payload = {
      name: certNameField.value.trim(),
      certificateNumber: certNumberField.value.trim(),
      district: certDistrictField.value,
    };

    generateCertBtn.disabled = true;
    generateCertBtnText.textContent = "Generating…";

    try {
      const res = await fetch("/api/documents/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        certFormError.textContent = data.error || "Something went wrong.";
        certFormError.classList.remove("hidden");
        return;
      }

      await downloadFromResponse(res);
      certForm.reset();
      loadCertificates();
    } catch (err) {
      certFormError.textContent = "Could not reach the server.";
      certFormError.classList.remove("hidden");
    } finally {
      generateCertBtn.disabled = false;
      generateCertBtnText.textContent = "Generate Certificate (PDF)";
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await WelfareLayout.init();
    if (user) {
      loadDistrictOptions(districtField);
      loadDistrictOptions(certDistrictField);
      loadLetters();
      loadCertificates();
    }
  });
})();
