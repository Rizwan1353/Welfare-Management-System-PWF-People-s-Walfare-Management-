// Districts page — table, search, add/edit modal, delete confirm.
// Talks to /api/districts (Step 5). Session guard + navbar handled by layout-common.js.

(function () {
  const tableBody = document.getElementById("districtsTableBody");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");

  const modal = document.getElementById("districtModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalError = document.getElementById("modalError");
  const form = document.getElementById("districtForm");
  const idField = document.getElementById("districtId");
  const nameField = document.getElementById("districtName");
  const presidentField = document.getElementById("districtPresident");
  const statusField = document.getElementById("districtStatus");
  const projectsCountField = document.getElementById("districtProjectsCount");
  const saveBtn = document.getElementById("saveDistrictBtn");
  const saveBtnText = document.getElementById("saveDistrictBtnText");

  const deleteModal = document.getElementById("deleteModal");
  const deleteModalText = document.getElementById("deleteModalText");
  let pendingDeleteId = null;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function statusPill(status) {
    const cls = status === "Active" ? "status-active" : "status-inactive";
    return `<span class="status-pill ${cls}">${status}</span>`;
  }

  function renderRows(districts) {
    if (!districts.length) {
      tableBody.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    tableBody.innerHTML = districts
      .map(
        (d) => `
      <tr class="hover:bg-black/[0.02] transition-colors" style="border-bottom: 1px solid #f1ede3;">
        <td class="px-5 py-3.5 font-medium text-[#0e2b2a]">${escapeHtml(d.name)}</td>
        <td class="px-5 py-3.5 text-[#3a352a]">${escapeHtml(d.president)}</td>
        <td class="px-5 py-3.5">${statusPill(d.status)}</td>
        <td class="px-5 py-3.5 text-[#3a352a]">${d.projectsCount}</td>
        <td class="px-5 py-3.5 text-right whitespace-nowrap">
          <button data-edit="${d.id}" class="text-xs font-medium text-[#3a6b8a] hover:underline mr-3">Edit</button>
          <button data-delete="${d.id}" data-name="${escapeHtml(d.name)}" class="text-xs font-medium text-[#a13b3b] hover:underline">Delete</button>
        </td>
      </tr>`
      )
      .join("");
  }

  let allDistricts = [];

  async function loadDistricts(search = "") {
    try {
      const url = search ? `/api/districts?search=${encodeURIComponent(search)}` : "/api/districts";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      allDistricts = data.districts;
      renderRows(allDistricts);
    } catch (err) {
      tableBody.innerHTML = "";
      emptyState.textContent = "Could not load districts.";
      emptyState.classList.remove("hidden");
    }
  }

  let searchTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadDistricts(searchInput.value.trim()), 250);
  });

  function openModal(mode, district) {
    modalError.classList.add("hidden");
    form.reset();
    if (mode === "edit" && district) {
      modalTitle.textContent = "Edit District";
      idField.value = district.id;
      nameField.value = district.name;
      presidentField.value = district.president;
      statusField.value = district.status;
      projectsCountField.value = district.projectsCount;
    } else {
      modalTitle.textContent = "Add District";
      idField.value = "";
      statusField.value = "Active";
      projectsCountField.value = 0;
    }
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  document.getElementById("addDistrictBtn").addEventListener("click", () => openModal("add"));
  document.getElementById("closeModalBtn").addEventListener("click", closeModal);
  document.getElementById("cancelModalBtn").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    modalError.classList.add("hidden");

    const payload = {
      name: nameField.value.trim(),
      president: presidentField.value.trim(),
      status: statusField.value,
      projectsCount: Number(projectsCountField.value || 0),
    };

    const id = idField.value;
    const isEdit = Boolean(id);

    saveBtn.disabled = true;
    saveBtnText.textContent = "Saving…";

    try {
      const res = await fetch(isEdit ? `/api/districts/${id}` : "/api/districts", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        modalError.textContent = data.error || "Something went wrong.";
        modalError.classList.remove("hidden");
        return;
      }

      closeModal();
      loadDistricts(searchInput.value.trim());
    } catch (err) {
      modalError.textContent = "Could not reach the server.";
      modalError.classList.remove("hidden");
    } finally {
      saveBtn.disabled = false;
      saveBtnText.textContent = "Save";
    }
  });

  tableBody.addEventListener("click", (e) => {
    const editId = e.target.getAttribute("data-edit");
    const deleteId = e.target.getAttribute("data-delete");

    if (editId) {
      const district = allDistricts.find((d) => d.id === editId);
      if (district) openModal("edit", district);
    }

    if (deleteId) {
      pendingDeleteId = deleteId;
      const name = e.target.getAttribute("data-name") || "this district";
      deleteModalText.textContent = `This will permanently remove "${name}".`;
      deleteModal.classList.remove("hidden");
    }
  });

  document.getElementById("cancelDeleteBtn").addEventListener("click", () => {
    pendingDeleteId = null;
    deleteModal.classList.add("hidden");
  });

  document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
    if (!pendingDeleteId) return;
    try {
      await fetch(`/api/districts/${pendingDeleteId}`, { method: "DELETE" });
    } finally {
      pendingDeleteId = null;
      deleteModal.classList.add("hidden");
      loadDistricts(searchInput.value.trim());
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await WelfareLayout.init();
    if (user) loadDistricts();
  });
})();
