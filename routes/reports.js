/**
 * Reports routes.
 * Three report types — Donations, Districts, Projects — each available
 * as a JSON preview (for the in-page table) or exported as PDF / Excel.
 * Staff only.
 */

const express = require("express");
const router = express.Router();

const { readAll } = require("../lib/db");
const { requireLogin } = require("../middleware/auth");
const { generateTableReportPdf } = require("../services/pdfGenerator");
const { generateTableReportExcel } = require("../services/excelGenerator");

const PKR = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 });
const dateFmt = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function sendReport({ req, res, title, subtitle, columns, rows, summaryLines, filenameBase }) {
  const format = req.query.format;

  if (format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.pdf"`);
    return generateTableReportPdf({ title, subtitle, columns, rows, summaryLines }, res);
  }

  if (format === "excel") {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.xlsx"`);
    return generateTableReportExcel({ title, columns, rows }, res);
  }

  return res.json({ title, subtitle, columns, rows, summaryLines });
}

// GET /api/reports/donations?format=pdf|excel&from=YYYY-MM-DD&to=YYYY-MM-DD&status=verified
router.get("/donations", requireLogin, (req, res) => {
  let donations = readAll("donations");
  const { from, to, status } = req.query;

  if (from) donations = donations.filter((d) => d.createdAt.slice(0, 10) >= from);
  if (to) donations = donations.filter((d) => d.createdAt.slice(0, 10) <= to);
  if (status) donations = donations.filter((d) => d.status === status);

  donations = [...donations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const verified = donations.filter((d) => d.status === "verified");
  const total = verified.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const byMethod = {};
  verified.forEach((d) => { byMethod[d.method] = (byMethod[d.method] || 0) + d.amount; });
  const byStatus = {};
  donations.forEach((d) => { byStatus[d.status || "pending"] = (byStatus[d.status || "pending"] || 0) + 1; });

  const statusLabel = { pending: "Pending", verified: "Verified", rejected: "Rejected" };

  const rows = donations.map((d) => ({
    referenceNo: d.referenceNo,
    name: d.name,
    senderAccountNumber: d.senderAccountNumber || "",
    amount: PKR.format(d.amount),
    method: d.method,
    status: statusLabel[d.status] || d.status || "Pending",
    date: dateFmt(d.createdAt),
  }));

  sendReport({
    req, res,
    title: "Donation Report",
    subtitle: from || to ? `Period: ${from || "start"} to ${to || "today"}` : "All donations",
    columns: [
      { key: "referenceNo", label: "Reference", width: 90 },
      { key: "name", label: "Donor Name", width: 80 },
      { key: "senderAccountNumber", label: "Account No.", width: 90 },
      { key: "amount", label: "Amount", width: 65 },
      { key: "method", label: "Method", width: 75 },
      { key: "status", label: "Status", width: 55 },
      { key: "date", label: "Date", width: 60 },
    ],
    rows,
    summaryLines: [
      `Total submissions: ${donations.length}`,
      `Verified amount: ${PKR.format(total)}`,
      ...Object.keys(byStatus).map((s) => `${statusLabel[s] || s}: ${byStatus[s]}`),
      ...Object.keys(byMethod).map((m) => `${m} (verified): ${PKR.format(byMethod[m])}`),
    ],
    filenameBase: "donation-report",
  });
});

// GET /api/reports/districts?format=pdf|excel
router.get("/districts", requireLogin, (req, res) => {
  const districts = [...readAll("districts")].sort((a, b) => a.name.localeCompare(b.name));

  const rows = districts.map((d) => ({
    name: d.name,
    president: d.president,
    status: d.status,
    projectsCount: d.projectsCount,
  }));

  sendReport({
    req, res,
    title: "District Report",
    subtitle: "All districts",
    columns: [
      { key: "name", label: "District", width: 150 },
      { key: "president", label: "President", width: 165 },
      { key: "status", label: "Status", width: 100 },
      { key: "projectsCount", label: "Projects", width: 100 },
    ],
    rows,
    summaryLines: [
      `Total districts: ${districts.length}`,
      `Active: ${districts.filter((d) => d.status === "Active").length}`,
    ],
    filenameBase: "district-report",
  });
});

// GET /api/reports/projects?format=pdf|excel&status=Active
router.get("/projects", requireLogin, (req, res) => {
  let projects = readAll("projects");
  if (req.query.status) projects = projects.filter((p) => p.status === req.query.status);
  projects = [...projects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalBudget = projects.reduce((sum, p) => sum + Number(p.budget || 0), 0);
  const byStatus = {};
  projects.forEach((p) => { byStatus[p.status] = (byStatus[p.status] || 0) + 1; });

  const rows = projects.map((p) => ({
    name: p.name,
    category: p.category,
    district: p.district,
    budget: PKR.format(p.budget),
    status: p.status,
  }));

  sendReport({
    req, res,
    title: "Project Report",
    subtitle: req.query.status ? `Status: ${req.query.status}` : "All projects",
    columns: [
      { key: "name", label: "Project", width: 140 },
      { key: "category", label: "Category", width: 90 },
      { key: "district", label: "District", width: 90 },
      { key: "budget", label: "Budget", width: 100 },
      { key: "status", label: "Status", width: 95 },
    ],
    rows,
    summaryLines: [
      `Total projects: ${projects.length}`,
      `Total budget: ${PKR.format(totalBudget)}`,
      ...Object.keys(byStatus).map((s) => `${s}: ${byStatus[s]}`),
    ],
    filenameBase: "project-report",
  });
});

// GET /api/reports/logs?format=pdf|excel&action=LOGIN
// Audit trail — Step 13. Tracks Login, Logout, Project Creation, Project
// Updates, and Donation Entries (written by lib/auditLog.js).
router.get("/logs", requireLogin, (req, res) => {
  let logs = readAll("logs");
  if (req.query.action) logs = logs.filter((l) => l.action === req.query.action);

  logs = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const dateTimeFmt = (iso) =>
    new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const actionLabel = {
    LOGIN: "Login",
    LOGOUT: "Logout",
    PROJECT_CREATED: "Project Created",
    PROJECT_UPDATED: "Project Updated",
    DONATION_ENTRY: "Donation Entry",
    DONATION_VERIFIED: "Donation Verified",
    DONATION_REJECTED: "Donation Rejected",
    PROFILE_UPDATED: "Profile Updated",
    LOGO_UPDATED: "Logo Updated",
  };

  const detailSummary = (log) => {
    if (log.action === "PROJECT_CREATED" || log.action === "PROJECT_UPDATED") return log.details.name || "";
    if (log.action === "PROFILE_UPDATED") return log.details.name || "";
    if (log.action === "LOGO_UPDATED") return log.details.width ? `${log.details.width}×${log.details.height}` : "";
    if (log.action === "DONATION_ENTRY" || log.action === "DONATION_VERIFIED" || log.action === "DONATION_REJECTED") {
      return `${log.details.referenceNo} — Rs ${log.details.amount}`;
    }
    return "";
  };

  const rows = logs.map((l) => ({
    action: actionLabel[l.action] || l.action,
    user: l.userEmail || "Public (no login)",
    details: detailSummary(l),
    timestamp: dateTimeFmt(l.timestamp),
  }));

  const byAction = {};
  logs.forEach((l) => { byAction[l.action] = (byAction[l.action] || 0) + 1; });

  sendReport({
    req, res,
    title: "Audit Log",
    subtitle: req.query.action ? `Action: ${actionLabel[req.query.action] || req.query.action}` : "All tracked actions",
    columns: [
      { key: "action", label: "Action", width: 110 },
      { key: "user", label: "User", width: 140 },
      { key: "details", label: "Details", width: 165 },
      { key: "timestamp", label: "Timestamp", width: 100 },
    ],
    rows,
    summaryLines: [
      `Total entries: ${logs.length}`,
      ...Object.keys(byAction).map((a) => `${actionLabel[a] || a}: ${byAction[a]}`),
    ],
    filenameBase: "audit-log",
  });
});

module.exports = router;
