/**
 * PDF generation service (pdfkit).
 * generateTableReportPdf() handles tabular reports (Donations, Districts,
 * Projects — Step 10). Offer letters and certificates (Steps 11-12) get
 * their own layout functions added to this file when those steps are built.
 */

const PDFDocument = require("pdfkit");
const path = require("path");

const BRAND = { teal: "#0e2b2a", gold: "#c99a4a", gray: "#7a7462", line: "#e5e0d3" };
const ORG_NAME = "People's Welfare Foundation";
const LOGO_PATH = path.join(__dirname, "..", "views", "assets", "pwf-logo.png");

function generateTableReportPdf({ title, subtitle, columns, rows, summaryLines = [] }, res) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);

  // Header
  doc.image(LOGO_PATH, 40, 32, { width: 34 });
  doc.fillColor(BRAND.teal).fontSize(18).font("Helvetica-Bold").text(ORG_NAME, 82, 36);
  doc.fillColor(BRAND.gray).fontSize(10).font("Helvetica").text(
    `Generated ${new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
    82, 58
  );
  doc.moveTo(40, 85).lineTo(555, 85).strokeColor(BRAND.line).stroke();

  doc.fillColor(BRAND.teal).fontSize(15).font("Helvetica-Bold").text(title, 40, 100);
  if (subtitle) {
    doc.fillColor(BRAND.gray).fontSize(10).font("Helvetica").text(subtitle, 40, 122);
  }

  let y = subtitle ? 148 : 130;

  if (summaryLines.length) {
    doc.fontSize(10).font("Helvetica-Bold").fillColor(BRAND.teal);
    summaryLines.forEach((line, i) => {
      doc.text(line, 40 + (i % 2) * 270, y + Math.floor(i / 2) * 16, { width: 260 });
    });
    y += Math.ceil(summaryLines.length / 2) * 16 + 14;
  }

  // Table
  const colWidths = columns.map((c) => c.width || 515 / columns.length);
  const startX = 40;

  function drawHeaderRow(rowY) {
    doc.rect(startX, rowY, 515, 22).fill("#f5f2e9");
    doc.fillColor(BRAND.teal).fontSize(9).font("Helvetica-Bold");
    let x = startX;
    columns.forEach((col, i) => {
      doc.text(col.label, x + 6, rowY + 6, { width: colWidths[i] - 10 });
      x += colWidths[i];
    });
  }

  drawHeaderRow(y);
  y += 22;

  doc.font("Helvetica").fontSize(9);
  rows.forEach((row, idx) => {
    if (y > 780) {
      doc.addPage();
      y = 40;
      drawHeaderRow(y);
      y += 22;
      doc.font("Helvetica").fontSize(9);
    }
    if (idx % 2 === 1) {
      doc.rect(startX, y, 515, 20).fill("#fbfaf6");
    }
    doc.fillColor("#2a2a2a");
    let x = startX;
    columns.forEach((col, i) => {
      const value = row[col.key] === undefined || row[col.key] === null ? "" : String(row[col.key]);
      doc.text(value, x + 6, y + 5, { width: colWidths[i] - 10, height: 14, ellipsis: true, lineBreak: false });
      x += colWidths[i];
    });
    y += 20;
  });

  doc.moveTo(startX, y + 4).lineTo(startX + 515, y + 4).strokeColor(BRAND.line).stroke();

  doc.end();
}

function generateOfferLetterPdf({ name, cnic, district, joiningDate, referenceNo }, streams) {
  const doc = new PDFDocument({ size: "A4", margin: 60 });
  streams.forEach((s) => doc.pipe(s));

  // Letterhead
  doc.image(LOGO_PATH, 60, 55, { width: 42 });
  doc.fillColor(BRAND.teal).fontSize(20).font("Helvetica-Bold").text(ORG_NAME, 112, 58, { width: 380 });
  doc.fillColor(BRAND.gray).fontSize(9).font("Helvetica").text("Volunteer Program Office  •  Sindh, Pakistan", 112, 82, { width: 380 });
  doc.y = 112;
  doc.x = 60;
  doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor(BRAND.gold).lineWidth(1.5).stroke();
  doc.moveDown(1.4);

  const issueDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.fillColor(BRAND.gray).fontSize(10).font("Helvetica").text(`Date: ${issueDate}`, { align: "right" });
  doc.text(`Ref: ${referenceNo}`, { align: "right" });
  doc.moveDown(1.2);

  doc.fillColor(BRAND.teal).fontSize(13).font("Helvetica-Bold").text("Offer of Volunteer Placement");
  doc.moveDown(0.8);

  doc.fillColor("#2a2a2a").fontSize(11).font("Helvetica").text(`Dear ${name},`, { lineGap: 4 });
  doc.moveDown(0.6);

  const joiningDateFmt = new Date(joiningDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  doc.text(
    `We are pleased to offer you a position as a volunteer with ${ORG_NAME}, serving the ${district} district. This letter confirms your acceptance into our volunteer program following review of your application.`,
    { align: "justify", lineGap: 4 }
  );
  doc.moveDown(0.8);
  doc.text(
    `Your volunteer term is set to begin on ${joiningDateFmt}. You will be working alongside our district team on ongoing relief, education, health, and community programs, and will receive guidance from your assigned district coordinator.`,
    { align: "justify", lineGap: 4 }
  );
  doc.moveDown(0.8);
  doc.text(
    `This offer is extended on a voluntary basis and does not constitute a contract of employment. We look forward to the contribution you will make to our district programs.`,
    { align: "justify", lineGap: 4 }
  );
  doc.moveDown(1.6);

  // Details box
  const boxY = doc.y;
  const boxHeight = 110;
  doc.rect(60, boxY, 475, boxHeight).fillOpacity(1).fillAndStroke("#f9f7f1", "#e5e0d3");
  doc.fillColor(BRAND.teal).fontSize(9).font("Helvetica-Bold").text("VOLUNTEER DETAILS", 80, boxY + 14);

  const rowY1 = boxY + 36;
  const rowY2 = boxY + 72;
  const colA = 80;
  const colB = 305;
  const labelW = 200;

  doc.fillColor(BRAND.gray).fontSize(8.5).font("Helvetica").text("NAME", colA, rowY1, { width: labelW });
  doc.fillColor("#2a2a2a").fontSize(11).font("Helvetica-Bold").text(name, colA, rowY1 + 12, { width: labelW });

  doc.fillColor(BRAND.gray).fontSize(8.5).font("Helvetica").text("DISTRICT", colB, rowY1, { width: labelW });
  doc.fillColor("#2a2a2a").fontSize(11).font("Helvetica-Bold").text(district, colB, rowY1 + 12, { width: labelW });

  doc.fillColor(BRAND.gray).fontSize(8.5).font("Helvetica").text("CNIC", colA, rowY2, { width: labelW });
  doc.fillColor("#2a2a2a").fontSize(11).font("Helvetica-Bold").text(cnic, colA, rowY2 + 12, { width: labelW });

  doc.fillColor(BRAND.gray).fontSize(8.5).font("Helvetica").text("JOINING DATE", colB, rowY2, { width: labelW });
  doc.fillColor("#2a2a2a").fontSize(11).font("Helvetica-Bold").text(joiningDateFmt, colB, rowY2 + 12, { width: labelW });

  doc.y = boxY + boxHeight + 20;
  doc.x = 60;

  doc.fillColor("#2a2a2a").fontSize(11).font("Helvetica").text("Welcome to the team.", { lineGap: 4 });
  doc.moveDown(2);

  doc.font("Helvetica-Bold").text(ORG_NAME);
  doc.font("Helvetica").fillColor(BRAND.gray).fontSize(9).text("Volunteer Program Office");

  doc.end();
}

function generateCertificatePdf({ name, certificateNumber, district }, streams) {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  streams.forEach((s) => doc.pipe(s));

  const W = doc.page.width;
  const H = doc.page.height;

  // Background
  doc.rect(0, 0, W, H).fill("#fdfcf8");

  // Outer decorative border
  doc.lineWidth(2).strokeColor(BRAND.gold).rect(24, 24, W - 48, H - 48).stroke();
  doc.lineWidth(0.75).strokeColor(BRAND.teal).rect(32, 32, W - 64, H - 64).stroke();

  // Corner flourishes (simple quarter-circle accents)
  [
    [24, 24, 0],
    [W - 24, 24, 90],
    [W - 24, H - 24, 180],
    [24, H - 24, 270],
  ].forEach(([cx, cy]) => {
    doc.circle(cx, cy, 5).fillOpacity(1).fill(BRAND.gold);
  });

  // Emblem — real logo
  const emblemCx = W / 2;
  const logoSize = 56;
  doc.image(LOGO_PATH, emblemCx - logoSize / 2, 48, { width: logoSize });

  // Title
  doc.fillColor(BRAND.teal).font("Helvetica-Bold").fontSize(28).text("Certificate of Appreciation", 0, 116, {
    align: "center", width: W,
  });
  doc.fillColor(BRAND.gray).font("Helvetica").fontSize(11).text(`${ORG_NAME}  •  Volunteer Program`, 0, 152, {
    align: "center", width: W,
  });

  doc.moveTo(W / 2 - 60, 174).lineTo(W / 2 + 60, 174).strokeColor(BRAND.gold).lineWidth(1).stroke();

  // Body
  doc.fillColor("#3a352a").font("Helvetica").fontSize(12).text("This certificate is proudly presented to", 0, 196, {
    align: "center", width: W,
  });

  doc.fillColor(BRAND.teal).font("Helvetica-Bold").fontSize(30).text(name, 0, 222, {
    align: "center", width: W,
  });

  doc.moveTo(W / 2 - 140, 262).lineTo(W / 2 + 140, 262).strokeColor("#d8d2c2").lineWidth(0.75).stroke();

  doc.fillColor("#3a352a").font("Helvetica").fontSize(11.5).text(
    `in recognition of dedicated volunteer service with ${ORG_NAME},\nserving the ${district} district community with commitment and care.`,
    0, 278, { align: "center", width: W, lineGap: 5 }
  );

  // Footer: certificate number, date, signature
  const footerY = H - 100;
  doc.fontSize(9.5).fillColor(BRAND.gray).font("Helvetica");
  doc.text(`Certificate No: ${certificateNumber}`, 90, footerY, { width: 220 });
  doc.text(
    `Date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    90, footerY + 16, { width: 220 }
  );

  const sigX = W - 90 - 200;
  doc.moveTo(sigX, footerY + 24).lineTo(sigX + 200, footerY + 24).strokeColor("#9c9584").lineWidth(0.75).stroke();
  doc.fillColor(BRAND.teal).font("Helvetica-Bold").fontSize(10).text(ORG_NAME, sigX, footerY + 30, { width: 200 });
  doc.fillColor(BRAND.gray).font("Helvetica").fontSize(8.5).text("Volunteer Program Office", sigX, footerY + 44, { width: 200 });

  doc.end();
}

module.exports = { generateTableReportPdf, generateOfferLetterPdf, generateCertificatePdf };
