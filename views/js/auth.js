// Login page behavior — talks to /api/auth/login (Step 2).
// Dashboard/session-guard usage on other pages is added as those pages are built.

(function () {
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorBox = document.getElementById("formError");
  const loginBtn = document.getElementById("loginBtn");
  const loginBtnText = document.getElementById("loginBtnText");

  const togglePassword = document.getElementById("togglePassword");
  const eyeIcon = document.getElementById("eyeIcon");

  const forgotLink = document.getElementById("forgotPasswordLink");
  const forgotModal = document.getElementById("forgotModal");
  const closeForgotModal = document.getElementById("closeForgotModal");

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
  }

  function hideError() {
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
  }

  function setLoading(isLoading) {
    loginBtn.disabled = isLoading;
    loginBtnText.textContent = isLoading ? "Signing in…" : "Login";
  }

  if (togglePassword) {
    togglePassword.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      togglePassword.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
      eyeIcon.innerHTML = isPassword
        ? '<path d="M3 3l18 18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9.9 5.2A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.1M6.5 6.6C4 8.3 2 12 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.8-.8M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>'
        : '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.4"/>';
    });
  }

  if (forgotLink) {
    forgotLink.addEventListener("click", () => forgotModal.classList.remove("hidden"));
  }
  if (closeForgotModal) {
    closeForgotModal.addEventListener("click", () => forgotModal.classList.add("hidden"));
  }
  if (forgotModal) {
    forgotModal.addEventListener("click", (e) => {
      if (e.target === forgotModal) forgotModal.classList.add("hidden");
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError();

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        showError("Please enter both your email and password.");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          showError(data.error || "Something went wrong. Please try again.");
          setLoading(false);
          return;
        }

        window.location.href = "/dashboard.html";
      } catch (err) {
        showError("Could not reach the server. Please try again.");
        setLoading(false);
      }
    });
  }
})();
