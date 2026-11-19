/**
 * PWF — People's Welfare Foundation — Welfare Management System
 * Node.js + Express + JSON file database (no MongoDB, no React).
 */

require("dotenv").config({ quiet: true });

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "views")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "welfare-secret-change-me-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// Root — send visitors to the login page (there is no separate landing page)
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// ---------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------
app.use("/api/auth", require("./routes/auth"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/districts", require("./routes/districts"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/volunteers", require("./routes/volunteers"));
app.use("/api/donations", require("./routes/donations"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/documents", require("./routes/documents"));
app.use("/api/settings", require("./routes/settings"));

// 404 for unmatched API routes (keeps JSON error shape consistent)
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`PWF — People's Welfare Foundation, running on http://localhost:${PORT}`);
});
