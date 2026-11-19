/**
 * Dashboard data routes.
 * Aggregates numbers from the other modules' JSON collections. Reads
 * only — District/Project/Donation/Volunteer CRUD lives in their own
 * route files (Steps 5, 6, 8, 7) once built.
 */

const express = require("express");
const router = express.Router();

const { readAll } = require("../lib/db");
const { requireLogin } = require("../middleware/auth");

router.get("/summary", requireLogin, (req, res) => {
  const districts = readAll("districts");
  const projects = readAll("projects");
  const donations = readAll("donations");
  const volunteers = readAll("volunteers");

  const totalDistricts = districts.length;
  const activeProjects = projects.filter((p) => p.status === "Active").length;
  const verifiedDonations = donations.filter((d) => d.status === "verified");
  const totalDonations = verifiedDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const pendingApprovals =
    volunteers.filter((v) => v.status === "pending").length +
    projects.filter((p) => p.status === "Pending").length +
    donations.filter((d) => d.status === "pending").length;

  // Donations trend — verified amount per day, last 14 days present in the data
  const byDay = {};
  verifiedDonations.forEach((d) => {
    const day = (d.createdAt || "").slice(0, 10);
    if (!day) return;
    byDay[day] = (byDay[day] || 0) + Number(d.amount || 0);
  });
  const donationTrend = Object.keys(byDay)
    .sort()
    .slice(-14)
    .map((day) => ({ day, amount: byDay[day] }));

  // Projects grouped by status, for the donut chart
  const statusCounts = {};
  projects.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });

  res.json({
    widgets: { totalDistricts, activeProjects, totalDonations, pendingApprovals },
    donationTrend,
    projectsByStatus: statusCounts,
  });
});

module.exports = router;
