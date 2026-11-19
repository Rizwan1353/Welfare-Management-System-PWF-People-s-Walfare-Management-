// Volunteer application page — fetches the configured Google Form URL
// from /api/volunteers/form-url (Step 7) and opens it on click.
// Public page: no session guard. If a staff session happens to exist,
// swap the "Staff Login" link for "Back to Dashboard".

(function () {
  const applyBtn = document.getElementById("applyBtn");
  const applyBtnText = document.getElementById("applyBtnText");
  const formNote = document.getElementById("formNote");
  const unconfiguredNote = document.getElementById("unconfiguredNote");
  const backLink = document.getElementById("backLink");

  let formUrl = "";

  async function loadFormUrl() {
    try {
      const res = await fetch("/api/volunteers/form-url");
      const data = await res.json();

      if (!res.ok || !data.configured) {
        applyBtnText.textContent = "Applications opening soon";
        unconfiguredNote.classList.remove("hidden");
        applyBtn.disabled = true;
        return;
      }

      formUrl = data.url;
      applyBtnText.textContent = "Apply as Volunteer";
      formNote.classList.remove("hidden");
      applyBtn.disabled = false;
    } catch (err) {
      applyBtnText.textContent = "Applications opening soon";
      unconfiguredNote.classList.remove("hidden");
      applyBtn.disabled = true;
    }
  }

  applyBtn.addEventListener("click", () => {
    if (formUrl) window.open(formUrl, "_blank", "noopener,noreferrer");
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
    loadFormUrl();
    checkStaffSession();
  });
})();
