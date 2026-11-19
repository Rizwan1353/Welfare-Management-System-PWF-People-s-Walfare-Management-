/**
 * District Management CRUD routes.
 * Fields: name, president, status ("Active" | "Inactive"), projectsCount.
 * Store: data/districts.json
 */

const express = require("express");
const router = express.Router();

const { readAll, writeAll } = require("../lib/db");
const { requireLogin } = require("../middleware/auth");

function genId() {
  return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function validate(body, { partial = false } = {}) {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (!body.name || !String(body.name).trim()) errors.push("District name is required");
  }
  if (!partial || body.president !== undefined) {
    if (!body.president || !String(body.president).trim()) errors.push("President is required");
  }
  if (!partial || body.status !== undefined) {
    if (!["Active", "Inactive"].includes(body.status)) errors.push('Status must be "Active" or "Inactive"');
  }
  if (body.projectsCount !== undefined && body.projectsCount !== null && body.projectsCount !== "") {
    if (isNaN(Number(body.projectsCount)) || Number(body.projectsCount) < 0) {
      errors.push("Projects count must be a non-negative number");
    }
  }
  return errors;
}

// GET /api/districts?search=term&status=Active
router.get("/", requireLogin, (req, res) => {
  let districts = readAll("districts");
  const { search, status } = req.query;

  if (search) {
    const term = String(search).toLowerCase();
    districts = districts.filter(
      (d) => d.name.toLowerCase().includes(term) || d.president.toLowerCase().includes(term)
    );
  }
  if (status) {
    districts = districts.filter((d) => d.status === status);
  }

  districts = [...districts].sort((a, b) => a.name.localeCompare(b.name));
  res.json({ districts });
});

// GET /api/districts/:id
router.get("/:id", requireLogin, (req, res) => {
  const districts = readAll("districts");
  const district = districts.find((d) => d.id === req.params.id);
  if (!district) return res.status(404).json({ error: "District not found" });
  res.json({ district });
});

// POST /api/districts
router.post("/", requireLogin, (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(", ") });

  const districts = readAll("districts");

  const duplicate = districts.some(
    (d) => d.name.trim().toLowerCase() === req.body.name.trim().toLowerCase()
  );
  if (duplicate) return res.status(409).json({ error: "A district with this name already exists" });

  const newDistrict = {
    id: genId(),
    name: req.body.name.trim(),
    president: req.body.president.trim(),
    status: req.body.status,
    projectsCount: Number(req.body.projectsCount || 0),
    createdAt: new Date().toISOString(),
  };

  districts.push(newDistrict);
  writeAll("districts", districts);

  res.status(201).json({ district: newDistrict });
});

// PUT /api/districts/:id
router.put("/:id", requireLogin, (req, res) => {
  const errors = validate(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(", ") });

  const districts = readAll("districts");
  const index = districts.findIndex((d) => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "District not found" });

  if (req.body.name) {
    const duplicate = districts.some(
      (d, i) => i !== index && d.name.trim().toLowerCase() === req.body.name.trim().toLowerCase()
    );
    if (duplicate) return res.status(409).json({ error: "A district with this name already exists" });
  }

  const updated = {
    ...districts[index],
    ...(req.body.name !== undefined && { name: req.body.name.trim() }),
    ...(req.body.president !== undefined && { president: req.body.president.trim() }),
    ...(req.body.status !== undefined && { status: req.body.status }),
    ...(req.body.projectsCount !== undefined && { projectsCount: Number(req.body.projectsCount) }),
    updatedAt: new Date().toISOString(),
  };

  districts[index] = updated;
  writeAll("districts", districts);

  res.json({ district: updated });
});

// DELETE /api/districts/:id
router.delete("/:id", requireLogin, (req, res) => {
  const districts = readAll("districts");
  const index = districts.findIndex((d) => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "District not found" });

  const [removed] = districts.splice(index, 1);
  writeAll("districts", districts);

  res.json({ district: removed });
});

module.exports = router;
