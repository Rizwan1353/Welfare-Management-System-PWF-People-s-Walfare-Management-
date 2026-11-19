/**
 * Project Management CRUD routes.
 * Fields: name, category, district (must match an existing district name),
 * budget (PKR), status ("Active" | "Pending" | "Completed" | "Inactive").
 * Store: data/projects.json
 */

const express = require("express");
const router = express.Router();

const { readAll, writeAll } = require("../lib/db");
const { requireLogin } = require("../middleware/auth");
const { logAction } = require("../lib/auditLog");

const STATUSES = ["Active", "Pending", "Completed", "Inactive"];

function genId() {
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function validate(body, { partial = false } = {}) {
  const errors = [];

  if (!partial || body.name !== undefined) {
    if (!body.name || !String(body.name).trim()) errors.push("Project name is required");
  }
  if (!partial || body.category !== undefined) {
    if (!body.category || !String(body.category).trim()) errors.push("Category is required");
  }
  if (!partial || body.district !== undefined) {
    if (!body.district || !String(body.district).trim()) errors.push("District is required");
    else {
      const districts = readAll("districts");
      const exists = districts.some((d) => d.name.toLowerCase() === String(body.district).trim().toLowerCase());
      if (!exists) errors.push("District must match an existing district");
    }
  }
  if (!partial || body.budget !== undefined) {
    if (body.budget === undefined || body.budget === null || body.budget === "" || isNaN(Number(body.budget)) || Number(body.budget) <= 0) {
      errors.push("Budget must be a positive number");
    }
  }
  if (!partial || body.status !== undefined) {
    if (!STATUSES.includes(body.status)) errors.push(`Status must be one of: ${STATUSES.join(", ")}`);
  }

  return errors;
}

// GET /api/projects?search=&status=&district=
router.get("/", requireLogin, (req, res) => {
  let projects = readAll("projects");
  const { search, status, district } = req.query;

  if (search) {
    const term = String(search).toLowerCase();
    projects = projects.filter(
      (p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
    );
  }
  if (status) projects = projects.filter((p) => p.status === status);
  if (district) projects = projects.filter((p) => p.district === district);

  projects = [...projects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ projects });
});

// GET /api/projects/:id
router.get("/:id", requireLogin, (req, res) => {
  const projects = readAll("projects");
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json({ project });
});

// POST /api/projects
router.post("/", requireLogin, (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(", ") });

  const projects = readAll("projects");

  const newProject = {
    id: genId(),
    name: req.body.name.trim(),
    category: req.body.category.trim(),
    district: req.body.district.trim(),
    budget: Number(req.body.budget),
    status: req.body.status,
    createdAt: new Date().toISOString(),
    createdBy: req.session.user ? req.session.user.id : null,
  };

  projects.push(newProject);
  writeAll("projects", projects);

  logAction("PROJECT_CREATED", req.session.user, { projectId: newProject.id, name: newProject.name });

  res.status(201).json({ project: newProject });
});

// PUT /api/projects/:id
router.put("/:id", requireLogin, (req, res) => {
  const errors = validate(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(", ") });

  const projects = readAll("projects");
  const index = projects.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Project not found" });

  const updated = {
    ...projects[index],
    ...(req.body.name !== undefined && { name: req.body.name.trim() }),
    ...(req.body.category !== undefined && { category: req.body.category.trim() }),
    ...(req.body.district !== undefined && { district: req.body.district.trim() }),
    ...(req.body.budget !== undefined && { budget: Number(req.body.budget) }),
    ...(req.body.status !== undefined && { status: req.body.status }),
    updatedAt: new Date().toISOString(),
  };

  projects[index] = updated;
  writeAll("projects", projects);

  logAction("PROJECT_UPDATED", req.session.user, { projectId: updated.id, name: updated.name, changes: Object.keys(req.body) });

  res.json({ project: updated });
});

// DELETE /api/projects/:id
router.delete("/:id", requireLogin, (req, res) => {
  const projects = readAll("projects");
  const index = projects.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Project not found" });

  const [removed] = projects.splice(index, 1);
  writeAll("projects", projects);

  res.json({ project: removed });
});

module.exports = router;
