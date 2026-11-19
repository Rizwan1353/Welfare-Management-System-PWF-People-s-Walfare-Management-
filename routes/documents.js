/**
 * Offer Letter + Certificate generation routes.
 * Step 11: Offer Letter Generator. Step 12: Certificate Generator.
 * Generated PDFs are saved server-side (storage/offer-letters/,
 * storage/certificates/) and streamed back to the browser at the same time.
 * Staff only.
 */

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const { requireLogin } = require("../middleware/auth");
const { generateOfferLetterPdf, generateCertificatePdf } = require("../services/pdfGenerator");
const { readAll } = require("../lib/db");

const OFFER_LETTERS_DIR = path.join(__dirname, "..", "storage", "offer-letters");
const CERTIFICATES_DIR = path.join(__dirname, "..", "storage", "certificates");

const CNIC_PATTERN = /^\d{5}-?\d{7}-?\d{1}$/;

function slugify(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function validate(body) {
  const errors = [];

  if (!body.name || !String(body.name).trim()) errors.push("Volunteer name is required");

  if (!body.cnic || !String(body.cnic).trim()) {
    errors.push("CNIC is required");
  } else if (!CNIC_PATTERN.test(String(body.cnic).trim())) {
    errors.push("CNIC must be in the format 12345-1234567-1");
  }

  if (!body.district || !String(body.district).trim()) {
    errors.push("District is required");
  } else {
    const districts = readAll("districts");
    const exists = districts.some((d) => d.name.toLowerCase() === String(body.district).trim().toLowerCase());
    if (!exists) errors.push("District must match an existing district");
  }

  if (!body.joiningDate || isNaN(new Date(body.joiningDate).getTime())) {
    errors.push("A valid joining date is required");
  }

  return errors;
}

// POST /api/documents/offer-letter — generates the PDF, saves it to
// storage/offer-letters/, and streams the same file back for download.
router.post("/offer-letter", requireLogin, (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(", ") });

  const name = String(req.body.name).trim();
  const cnic = String(req.body.cnic).trim();
  const district = String(req.body.district).trim();
  const joiningDate = req.body.joiningDate;

  const referenceNo = "OL-" + Date.now().toString(36).toUpperCase();
  const filename = `${slugify(name)}-${referenceNo}.pdf`.toLowerCase();
  const filePath = path.join(OFFER_LETTERS_DIR, filename);

  if (!fs.existsSync(OFFER_LETTERS_DIR)) fs.mkdirSync(OFFER_LETTERS_DIR, { recursive: true });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const fileStream = fs.createWriteStream(filePath);
  generateOfferLetterPdf({ name, cnic, district, joiningDate, referenceNo }, [fileStream, res]);
});

// GET /api/documents/offer-letters — list previously generated letters
router.get("/offer-letters", requireLogin, (req, res) => {
  if (!fs.existsSync(OFFER_LETTERS_DIR)) return res.json({ letters: [] });

  const letters = fs
    .readdirSync(OFFER_LETTERS_DIR)
    .filter((f) => f.endsWith(".pdf"))
    .map((f) => {
      const stat = fs.statSync(path.join(OFFER_LETTERS_DIR, f));
      return { filename: f, createdAt: stat.birthtime };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ letters });
});

// GET /api/documents/offer-letters/:filename — re-download a saved letter
router.get("/offer-letters/:filename", requireLogin, (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(OFFER_LETTERS_DIR, safeName);

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Offer letter not found" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
  fs.createReadStream(filePath).pipe(res);
});

// ---------------------------------------------------------------------
// Certificate Generator (Step 12)
// ---------------------------------------------------------------------

function validateCertificate(body) {
  const errors = [];

  if (!body.name || !String(body.name).trim()) errors.push("Volunteer name is required");

  if (!body.certificateNumber || !String(body.certificateNumber).trim()) {
    errors.push("Certificate number is required");
  }

  if (!body.district || !String(body.district).trim()) {
    errors.push("District is required");
  } else {
    const districts = readAll("districts");
    const exists = districts.some((d) => d.name.toLowerCase() === String(body.district).trim().toLowerCase());
    if (!exists) errors.push("District must match an existing district");
  }

  return errors;
}

// POST /api/documents/certificate — generates the PDF, saves it to
// storage/certificates/, and streams the same file back for download.
router.post("/certificate", requireLogin, (req, res) => {
  const errors = validateCertificate(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(", ") });

  const name = String(req.body.name).trim();
  const certificateNumber = String(req.body.certificateNumber).trim();
  const district = String(req.body.district).trim();

  const filename = `${slugify(name)}-${slugify(certificateNumber)}.pdf`.toLowerCase();
  const filePath = path.join(CERTIFICATES_DIR, filename);

  if (!fs.existsSync(CERTIFICATES_DIR)) fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const fileStream = fs.createWriteStream(filePath);
  generateCertificatePdf({ name, certificateNumber, district }, [fileStream, res]);
});

// GET /api/documents/certificates — list previously generated certificates
router.get("/certificates", requireLogin, (req, res) => {
  if (!fs.existsSync(CERTIFICATES_DIR)) return res.json({ certificates: [] });

  const certificates = fs
    .readdirSync(CERTIFICATES_DIR)
    .filter((f) => f.endsWith(".pdf"))
    .map((f) => {
      const stat = fs.statSync(path.join(CERTIFICATES_DIR, f));
      return { filename: f, createdAt: stat.birthtime };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ certificates });
});

// GET /api/documents/certificates/:filename — re-download a saved certificate
router.get("/certificates/:filename", requireLogin, (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(CERTIFICATES_DIR, safeName);

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Certificate not found" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
