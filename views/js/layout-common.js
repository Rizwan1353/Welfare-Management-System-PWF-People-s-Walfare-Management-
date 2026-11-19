/**
 * Shared page-chrome behavior, reused by every module page (Dashboard,
 * Districts, Projects, Donations, Volunteers, Reports).
 * Handles: session guard, profile dropdown, notifications dropdown,
 * mobile sidebar toggle, logout, and the Edit Profile modal (name +
 * org logo upload, logo section only shown for Chairperson — the server
 * enforces this too). Each page's own script only needs to handle its
 * own content.
 *
 * Expects the standard shell IDs to exist in the page's HTML:
 * sidebar, sidebarOverlay, sidebarToggle, sidebarLogoutBtn,
 * notifBtn, notifDropdown, notifList, notifBadge,
 * profileBtn, profileDropdown, profileLogoutBtn,
 * profileAvatar, profileName, profileRole, profileDropdownName, profileDropdownEmail,
 * editProfileBtn, editProfileModal, editProfileName, editLogoSection,
 * editLogoFile, currentLogoPreview, editProfileForm, editProfileError,
 * editProfileSuccess, saveProfileBtn, saveProfileBtnText,
 * closeEditProfileBtn, cancelEditProfileBtn
 */

const WelfareLayout = (function () {
  let currentUser = null;

  function initials(name) {
    if (!name) return "--";
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name.slice(0, 2).toUpperCase();
  }

  function applyUserToChrome(user) {
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    set("profileAvatar", initials(user.name));
    set("profileName", user.name);
    set("profileRole", user.role);
    set("profileDropdownName", user.name);
    set("profileDropdownEmail", user.email);
  }

  async function guardSessionAndLoadProfile() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        window.location.href = "/login.html";
        return null;
      }
      const { user } = await res.json();
      currentUser = user;
      applyUserToChrome(user);
      return user;
    } catch (err) {
      window.location.href = "/login.html";
      return null;
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login.html";
    }
  }

  function wireDropdown(btnId, dropdownId) {
    const btn = document.getElementById(btnId);
    const dropdown = document.getElementById(dropdownId);
    if (!btn || !dropdown) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = !dropdown.classList.contains("hidden");
      document.querySelectorAll("[data-dropdown]").forEach((el) => el.classList.add("hidden"));
      dropdown.classList.toggle("hidden", isOpen);
    });
  }

  function wireSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const toggle = document.getElementById("sidebarToggle");
    if (!sidebar || !overlay || !toggle) return;

    toggle.addEventListener("click", () => {
      sidebar.classList.add("open");
      overlay.classList.remove("hidden");
    });
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.add("hidden");
    });
  }

  async function loadNotifications() {
    const list = document.getElementById("notifList");
    const badge = document.getElementById("notifBadge");
    if (!list) return;
    try {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) return;
      const data = await res.json();
      const pending = data.widgets.pendingApprovals;
      if (pending > 0) {
        badge?.classList.remove("hidden");
        list.innerHTML = `<div class="px-4 py-3 text-sm text-[#3a352a] hover:bg-black/5 transition-colors cursor-default"><span class="font-medium">${pending}</span> item${pending === 1 ? "" : "s"} waiting on your approval.</div>`;
      } else {
        list.innerHTML = `<div class="px-4 py-6 text-sm text-[#7a7462] text-center">You're all caught up.</div>`;
      }
    } catch (err) {
      list.innerHTML = `<div class="px-4 py-6 text-sm text-[#7a7462] text-center">Couldn't load notifications.</div>`;
    }
  }

  // ---- Edit Profile (name + org logo for Chairperson) ----
  function bustLogoCache() {
    const stamp = Date.now();
    document.querySelectorAll('img[src*="pwf-logo.png"]').forEach((img) => {
      const base = img.src.split("?")[0];
      img.src = `${base}?t=${stamp}`;
    });
  }

  function wireEditProfile() {
    const editBtn = document.getElementById("editProfileBtn");
    const modal = document.getElementById("editProfileModal");
    if (!editBtn || !modal) return;

    const nameField = document.getElementById("editProfileName");
    const logoSection = document.getElementById("editLogoSection");
    const logoFile = document.getElementById("editLogoFile");
    const logoPreview = document.getElementById("currentLogoPreview");
    const form = document.getElementById("editProfileForm");
    const errorBox = document.getElementById("editProfileError");
    const successBox = document.getElementById("editProfileSuccess");
    const saveBtn = document.getElementById("saveProfileBtn");
    const saveBtnText = document.getElementById("saveProfileBtnText");

    function openModal() {
      errorBox.classList.add("hidden");
      successBox.classList.add("hidden");
      nameField.value = currentUser ? currentUser.name : "";
      logoFile.value = "";
      logoPreview.src = `/assets/pwf-logo.png?t=${Date.now()}`;
      logoSection.classList.toggle("hidden", !(currentUser && currentUser.role === "Chairperson"));
      document.getElementById("profileDropdown")?.classList.add("hidden");
      modal.classList.remove("hidden");
    }
    function closeModal() {
      modal.classList.add("hidden");
    }

    editBtn.addEventListener("click", openModal);
    document.getElementById("closeEditProfileBtn")?.addEventListener("click", closeModal);
    document.getElementById("cancelEditProfileBtn")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    logoFile.addEventListener("change", () => {
      if (logoFile.files && logoFile.files[0]) {
        logoPreview.src = URL.createObjectURL(logoFile.files[0]);
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorBox.classList.add("hidden");
      successBox.classList.add("hidden");

      const name = nameField.value.trim();
      if (!name) {
        errorBox.textContent = "Name is required.";
        errorBox.classList.remove("hidden");
        return;
      }

      saveBtn.disabled = true;
      saveBtnText.textContent = "Saving…";

      try {
        const profileRes = await fetch("/api/auth/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const profileData = await profileRes.json();

        if (!profileRes.ok) {
          errorBox.textContent = profileData.error || "Could not update your profile.";
          errorBox.classList.remove("hidden");
          return;
        }

        currentUser = profileData.user;
        applyUserToChrome(currentUser);

        let logoChanged = false;
        if (!logoSection.classList.contains("hidden") && logoFile.files && logoFile.files[0]) {
          const formData = new FormData();
          formData.append("logo", logoFile.files[0]);
          const logoRes = await fetch("/api/settings/logo", { method: "POST", body: formData });
          const logoData = await logoRes.json();

          if (!logoRes.ok) {
            errorBox.textContent = logoData.error || "Profile saved, but the logo could not be updated.";
            errorBox.classList.remove("hidden");
            return;
          }
          logoChanged = true;
        }

        if (logoChanged) bustLogoCache();

        successBox.textContent = "Saved.";
        successBox.classList.remove("hidden");
        setTimeout(closeModal, 900);
      } catch (err) {
        errorBox.textContent = "Could not reach the server.";
        errorBox.classList.remove("hidden");
      } finally {
        saveBtn.disabled = false;
        saveBtnText.textContent = "Save";
      }
    });
  }

  async function init() {
    wireSidebar();
    wireDropdown("notifBtn", "notifDropdown");
    wireDropdown("profileBtn", "profileDropdown");
    wireEditProfile();

    document.getElementById("profileLogoutBtn")?.addEventListener("click", logout);
    document.getElementById("sidebarLogoutBtn")?.addEventListener("click", logout);

    document.addEventListener("click", () => {
      document.getElementById("notifDropdown")?.classList.add("hidden");
      document.getElementById("profileDropdown")?.classList.add("hidden");
    });

    const user = await guardSessionAndLoadProfile();
    if (user) loadNotifications();
    return user;
  }

  return { init, logout };
})();
