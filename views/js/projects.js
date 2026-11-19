// Projects page — table, search + status filter, add/edit modal, view modal,
// delete confirm. Talks to /api/projects and /api/districts (Step 6).
// Session guard + navbar handled by layout-common.js.

(function () {
  const PKR = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 });

  const tableBody = document.getElementById("projectsTableBody");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");

  const modal = document.getElementById("projectModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalError = document.getElementById("modalError");
  const form = document.getElementById("projectForm");
  const idField = document.getElementById("projectId");
  const nameField = document.getElementById("projectName");
  const categoryField = document.getElementById("projectCategory");
  const districtField = document.getElementById("projectDistrict");
  const budgetField = document.getElementById("projectBudget");
  const statusField = document.getElementById("projectStatus");
  const saveBtn = document.getElementById("saveProjectBtn");
  const saveBtnText = document.getElementById("saveProjectBtnText");

  const viewModal = document.getElementById("viewModal");

  const deleteModal = document.getElementById("deleteModal");
  const deleteModalText = document.getElementById("deleteModalText");
  let pendingDeleteId = null;

  let allProjects = [];

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function statusPill(status) {
    const map = { Active: "status-active", Pending: "status-pending", Completed: "status-completed", Inactive: "status-inactive" };
    return `<span class="status-pill ${map[status] || "status-inactive"}">${status}</span>`;
  }

  function renderRows(projects) {
    if (!projects.length) {
      tableBody.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    tableBody.innerHTML = projects
      .map(
        (p) => `
      <tr class="hover:bg-black/[0.02] transition-colors" style="border-bottom: 1px solid #f1ede3;">
        <td class="px-5 py-3.5 font-medium text-[#0e2b2a]">${escapeHtml(p.name)}</td>
        <td class="px-5 py-3.5 text-[#3a352a]">${escapeHtml(p.category)}</td>
        <td class="px-5 py-3.5 text-[#3a352a]">${escapeHtml(p.district)}</td>
        <td class="px-5 py-3.5 text-[#3a352a]">${PKR.format(p.budget)}</td>
        <td class="px-5 py-3.5">${statusPill(p.status)}</td>
        <td class="px-5 py-3.5 text-right whitespace-nowrap">
          <button data-view="${p.id}" class="text-xs font-medium text-[#3f6b4f] hover:underline mr-3">View</button>
          <button data-edit="${p.id}" class="text-xs font-medium text-[#3a6b8a] hover:underline mr-3">Edit</button>
          <button data-delete="${p.id}" data-name="${escapeHtml(p.name)}" class="text-xs font-medium text-[#a13b3b] hover:underline">Delete</button>
        </td>
      </tr>`
      )
      .join("");
  }

  async function loadDistrictOptions() {
    try {
      const res = await fetch("/api/districts");
      if (!res.ok) return;
      const data = await res.json();
      districtField.innerHTML =
        `<option value="">Select a district…</option>` +
        data.districts.map((d) => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`).join("");
    } catch (err) {
      // district select stays with just the placeholder option
    }
  }

  async function loadProjects() {
    try {
      const params = new URLSearchParams();
      if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
      if (statusFilter.value) params.set("status", statusFilter.value);
      const qs = params.toString();

      const res = await fetch(`/api/projects${qs ? "?" + qs : ""}`);
      if (!res.ok) return;
      const data = await res.json();
      allProjects = data.projects;
      renderRows(allProjects);
    } catch (err) {
      tableBody.innerHTML = "";
      emptyState.textContent = "Could not load projects.";
      emptyState.classList.remove("hidden");
    }
  }

  let searchTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadProjects, 250);
  });
  statusFilter.addEventListener("change", loadProjects);

  function openModal(mode, project) {
    modalError.classList.add("hidden");
    form.reset();
    if (mode === "edit" && project) {
      modalTitle.textContent = "Edit Project";
      idField.value = project.id;
      nameField.value = project.name;
      categoryField.value = project.category;
      districtField.value = project.district;
      budgetField.value = project.budget;
      statusField.value = project.status;
    } else {
      modalTitle.textContent = "Add Project";
      idField.value = "";
      statusField.value = "Pending";
    }
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  document.getElementById("addProjectBtn").addEventListener("click", () => openModal("add"));
  document.getElementById("closeModalBtn").addEventListener("click", closeModal);
  document.getElementById("cancelModalBtn").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    modalError.classList.add("hidden");

    const payload = {
      name: nameField.value.trim(),
      category: categoryField.value.trim(),
      district: districtField.value,
      budget: Number(budgetField.value),
      status: statusField.value,
    };

    const id = idField.value;
    const isEdit = Boolean(id);

    saveBtn.disabled = true;
    saveBtnText.textContent = "Saving…";

    try {
      const res = await fetch(isEdit ? `/api/projects/${id}` : "/api/projects", {
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
      loadProjects();
    } catch (err) {
      modalError.textContent = "Could not reach the server.";
      modalError.classList.remove("hidden");
    } finally {
      saveBtn.disabled = false;
      saveBtnText.textContent = "Save";
    }
  });

  function openViewModal(project) {
    document.getElementById("viewName").textContent = project.name;
    document.getElementById("viewCategory").textContent = project.category;
    document.getElementById("viewDistrict").textContent = project.district;
    document.getElementById("viewBudget").textContent = PKR.format(project.budget);
    document.getElementById("viewStatus").innerHTML = statusPill(project.status);
    document.getElementById("viewCreated").textContent = new Date(project.createdAt).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
    viewModal.classList.remove("hidden");
  }

  function closeViewModal() {
    viewModal.classList.add("hidden");
  }
  document.getElementById("closeViewModalBtn").addEventListener("click", closeViewModal);
  document.getElementById("closeViewModalBtn2").addEventListener("click", closeViewModal);
  viewModal.addEventListener("click", (e) => { if (e.target === viewModal) closeViewModal(); });

  tableBody.addEventListener("click", (e) => {
    const viewId = e.target.getAttribute("data-view");
    const editId = e.target.getAttribute("data-edit");
    const deleteId = e.target.getAttribute("data-delete");

    if (viewId) {
      const project = allProjects.find((p) => p.id === viewId);
      if (project) openViewModal(project);
    }
    if (editId) {
      const project = allProjects.find((p) => p.id === editId);
      if (project) openModal("edit", project);
    }
    if (deleteId) {
      pendingDeleteId = deleteId;
      const name = e.target.getAttribute("data-name") || "this project";
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
      await fetch(`/api/projects/${pendingDeleteId}`, { method: "DELETE" });
    } finally {
      pendingDeleteId = null;
      deleteModal.classList.add("hidden");
      loadProjects();
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await WelfareLayout.init();
    if (user) {
      loadDistrictOptions();
      loadProjects();
    }
  });
})();
