/**
 * Authentication routes.
 * Login / Logout / Session, checked against data/users.json.
 * No signup route exists anywhere — accounts are created manually
 * (directly in users.json for now; an admin-facing "create user" UI
 * can be added later without changing this contract).
 */

const express = require("express");
const router = express.Router();

const { readAll, writeAll } = require("../lib/db");
const { verifyPassword } = require("../lib/password");
const { requireLogin } = require("../middleware/auth");
const { logAction } = require("../lib/auditLog");

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const users = readAll("users");
  const user = users.find(
    (u) => u.email.toLowerCase() === String(email).toLowerCase()
  );

  if (!user || !user.active) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Never put the password hash in the session or the response
  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    district: user.district || null,
  };

  req.session.user = sessionUser;
  logAction("LOGIN", sessionUser);

  res.json({ message: "Login successful", user: sessionUser });
});

// POST /api/auth/logout
router.post("/logout", requireLogin, (req, res) => {
  const user = req.session.user;
  logAction("LOGOUT", user);

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out, try again" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

// GET /api/auth/me — current session info (used by the frontend to
// guard pages and to populate the navbar/profile dropdown)
router.get("/me", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  res.json({ user: req.session.user });
});

// PATCH /api/auth/profile — the logged-in user edits their own name.
// (Email/role/district are managed by an admin via scripts/create-user.js,
// not self-editable here.)
router.patch("/profile", requireLogin, (req, res) => {
  const name = req.body.name ? String(req.body.name).trim() : "";
  if (!name) return res.status(400).json({ error: "Name is required" });

  const users = readAll("users");
  const index = users.findIndex((u) => u.id === req.session.user.id);
  if (index === -1) return res.status(404).json({ error: "User not found" });

  users[index] = { ...users[index], name };
  writeAll("users", users);

  // Keep the session in sync so the navbar updates immediately
  req.session.user = { ...req.session.user, name };

  logAction("PROFILE_UPDATED", req.session.user, { name });

  res.json({ user: req.session.user });
});

module.exports = router;
