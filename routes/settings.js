/**
 * App-wide settings — currently just the organization logo.
 * The uploaded file always overwrites views/assets/pwf-logo.png, which is
 * the single file every page (and every generated PDF) already points to —
 * so a successful upload here applies everywhere with no other changes.
 *
 * Restricted to Chairperson: this is organization branding, not a personal
 * profile picture.
 */

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const jpeg = require("jpeg-js");
const { PNG } = require("pngjs");

const { requireRole } = require("../middleware/auth");
const { logAction } = require("../lib/auditLog");

const LOGO_PATH = path.join(__dirname, "..", "views", "assets", "pwf-logo.png");
const MAX_DIMENSION = 800; // keep generated PDFs and page loads light

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
      return cb(new Error("Logo must be a JPG or PNG image"));
    }
    cb(null, true);
  },
});

function downscaleIfNeeded(width, height, data) {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) return { width, height, data };

  // Simple nearest-neighbor downscale — keeps this dependency-free.
  const scale = MAX_DIMENSION / Math.max(width, height);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);
  const out = Buffer.alloc(newWidth * newHeight * 4);

  for (let y = 0; y < newHeight; y++) {
    const srcY = Math.min(height - 1, Math.floor(y / scale));
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.min(width - 1, Math.floor(x / scale));
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * newWidth + x) * 4;
      data.copy(out, dstIdx, srcIdx, srcIdx + 4);
    }
  }

  return { width: newWidth, height: newHeight, data: out };
}

// POST /api/settings/logo — Chairperson only
router.post("/logo", requireRole("Chairperson"), (req, res) => {
  upload.single("logo")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No logo file was uploaded" });

    try {
      let width, height, rgba;

      if (req.file.mimetype === "image/jpeg") {
        const decoded = jpeg.decode(req.file.buffer, { useTArray: true });
        width = decoded.width;
        height = decoded.height;
        rgba = Buffer.from(decoded.data);
      } else {
        const decoded = PNG.sync.read(req.file.buffer);
        width = decoded.width;
        height = decoded.height;
        rgba = decoded.data;
      }

      const scaled = downscaleIfNeeded(width, height, rgba);

      const png = new PNG({ width: scaled.width, height: scaled.height });
      scaled.data.copy(png.data);
      const outBuffer = PNG.sync.write(png);

      fs.writeFileSync(LOGO_PATH, outBuffer);

      logAction("LOGO_UPDATED", req.session.user, { width: scaled.width, height: scaled.height });

      res.json({ message: "Logo updated", updatedAt: new Date().toISOString() });
    } catch (e) {
      res.status(400).json({ error: "Could not process that image. Try a different JPG or PNG file." });
    }
  });
});

module.exports = router;
