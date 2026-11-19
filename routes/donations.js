/**
 * Donation routes.
 *
 * No real payment processing happens in this app — no dummy/instant money
 * transfer. The actual flow:
 *   1. Donor views our bank / JazzCash / EasyPaisa details (GET /payment-info).
 *   2. Donor sends the money themselves, from their own wallet/bank app.
 *   3. Donor comes back and submits their name, the account number they
 *      paid FROM, the amount, the method, and a photo/screenshot of the
 *      payment slip as proof (POST / — multipart/form-data).
 *   4. Staff reviews each submission against the uploaded slip and marks
 *      it Verified or Rejected (PATCH /:id/status). Nothing is treated as
 *      a confirmed donation until a staff member verifies it.
 */

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const { readAll, writeAll } = require("../lib/db");
const { requireLogin } = require("../middleware/auth");
const { logAction } = require("../lib/auditLog");

const METHODS = ["EasyPaisa", "JazzCash", "Bank Transfer"];
const MIN_AMOUNT = 50;
const STATUSES = ["pending", "verified", "rejected"];
const CONFIG_PATH = path.join(__dirname, "..", "config", "config.json");
const SLIPS_DIR = path.join(__dirname, "..", "storage", "payment-slips");

if (!fs.existsSync(SLIPS_DIR)) fs.mkdirSync(SLIPS_DIR, { recursive: true });

function genId() {
  return "don" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function nextReferenceNo(donations) {
  const year = new Date().getFullYear();
  const numbers = donations
    .map((d) => d.referenceNo)
    .filter((r) => r && r.startsWith(`WF-${year}-`))
    .map((r) => parseInt(r.split("-")[2], 10))
    .filter((n) => !isNaN(n));
  const next = (numbers.length ? Math.max(...numbers) : 100) + 1;
  return `WF-${year}-${String(next).padStart(6, "0")}`;
}

// ---------------------------------------------------------------------
// File upload handling (payment slip — image or PDF, 5MB max)
// ---------------------------------------------------------------------
const ALLOWED_SLIP_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, SLIPS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      cb(null, `slip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_SLIP_TYPES.includes(file.mimetype)) {
      return cb(new Error("Payment slip must be a JPG, PNG, WEBP, or PDF file"));
    }
    cb(null, true);
  },
});

function validate(body, file) {
  const errors = [];

  if (!body.name || !String(body.name).trim()) errors.push("Name is required");

  if (!body.senderAccountNumber || !String(body.senderAccountNumber).trim()) {
    errors.push("The account number you paid from is required");
  }

  if (body.amount === undefined || body.amount === null || body.amount === "" || isNaN(Number(body.amount))) {
    errors.push("Amount is required");
  } else if (Number(body.amount) < MIN_AMOUNT) {
    errors.push(`Minimum donation amount is Rs ${MIN_AMOUNT}`);
  }

  if (!METHODS.includes(body.method)) errors.push(`Method must be one of: ${METHODS.join(", ")}`);

  if (!file) errors.push("A payment slip (screenshot or photo) is required");

  return errors;
}

// GET /api/donations/payment-info — public. Our bank/JazzCash/EasyPaisa
// details for donors to send money to, before they submit proof.
router.get("/payment-info", (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    res.json({ paymentDetails: config.paymentDetails || {} });
  } catch (err) {
    res.status(500).json({ error: "Could not load payment details" });
  }
});

// POST /api/donations — public, no login. Submits proof of a payment the
// donor already sent themselves. Always starts out "pending" — nothing is
// auto-confirmed.
router.post("/", (req, res) => {
  upload.single("slip")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });

    const errors = validate(req.body, req.file);
    if (errors.length) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: errors.join(", ") });
    }

    const donations = readAll("donations");

    const newDonation = {
      id: genId(),
      name: String(req.body.name).trim(),
      senderAccountNumber: String(req.body.senderAccountNumber).trim(),
      amount: Number(req.body.amount),
      method: req.body.method,
      referenceNo: nextReferenceNo(donations),
      slipFilename: req.file.filename,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    donations.push(newDonation);
    writeAll("donations", donations);

    logAction("DONATION_ENTRY", null, {
      donationId: newDonation.id,
      referenceNo: newDonation.referenceNo,
      amount: newDonation.amount,
      method: newDonation.method,
    });

    res.status(201).json({ donation: newDonation });
  });
});

// GET /api/donations — staff only
router.get("/", requireLogin, (req, res) => {
  let donations = readAll("donations");
  const { search, method, status } = req.query;

  if (search) {
    const term = String(search).toLowerCase();
    donations = donations.filter(
      (d) => d.name.toLowerCase().includes(term) || d.referenceNo.toLowerCase().includes(term)
    );
  }
  if (method) donations = donations.filter((d) => d.method === method);
  if (status) donations = donations.filter((d) => d.status === status);

  donations = [...donations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ donations });
});

// GET /api/donations/:id — staff only
router.get("/:id", requireLogin, (req, res) => {
  const donations = readAll("donations");
  const donation = donations.find((d) => d.id === req.params.id);
  if (!donation) return res.status(404).json({ error: "Donation not found" });
  res.json({ donation });
});

// GET /api/donations/:id/slip — staff only, view/download the uploaded proof
router.get("/:id/slip", requireLogin, (req, res) => {
  const donations = readAll("donations");
  const donation = donations.find((d) => d.id === req.params.id);
  if (!donation || !donation.slipFilename) return res.status(404).json({ error: "Payment slip not found" });

  const filePath = path.join(SLIPS_DIR, donation.slipFilename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Payment slip not found" });

  res.sendFile(filePath);
});

// PATCH /api/donations/:id/status — staff only. The actual review step:
// mark a submission Verified (money confirmed received) or Rejected.
router.patch("/:id/status", requireLogin, (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(", ")}` });
  }

  const donations = readAll("donations");
  const index = donations.findIndex((d) => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Donation not found" });

  donations[index] = {
    ...donations[index],
    status,
    reviewedBy: req.session.user.id,
    reviewedAt: new Date().toISOString(),
  };
  writeAll("donations", donations);

  logAction(status === "verified" ? "DONATION_VERIFIED" : "DONATION_REJECTED", req.session.user, {
    donationId: donations[index].id,
    referenceNo: donations[index].referenceNo,
    amount: donations[index].amount,
  });

  res.json({ donation: donations[index] });
});

module.exports = router;
