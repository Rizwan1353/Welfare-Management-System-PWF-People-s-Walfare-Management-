/**
 * Volunteer Application routes.
 * No volunteer accounts exist anywhere in this system — applicants fill
 * out an external Google Form, reviewed manually by staff. This route
 * only serves the configured form URL so it can be changed in
 * config/config.json without touching any frontend code.
 *
 * Public (no login) — applicants are members of the public, not staff.
 */

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "config", "config.json");

// GET /api/volunteers/form-url
router.get("/form-url", (req, res) => {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const config = JSON.parse(raw);
    const url = config.volunteerGoogleFormUrl || "";
    const configured = Boolean(url) && !url.includes("REPLACE_WITH_REAL_FORM_URL");
    res.json({ url, configured });
  } catch (err) {
    res.status(500).json({ error: "Could not load the volunteer form configuration" });
  }
});

module.exports = router;
