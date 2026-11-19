/**
 * Excel generation service (exceljs).
 * generateTableReportExcel() handles tabular reports for Step 10
 * (Donations, Districts, Projects).
 */

const ExcelJS = require("exceljs");

async function generateTableReportExcel({ title, columns, rows }, res) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "People's Welfare Foundation";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title.slice(0, 31) || "Report");

  sheet.columns = columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: col.excelWidth || 22,
  }));

  sheet.getRow(1).font = { bold: true, color: { argb: "FF0E2B2A" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F2E9" } };

  rows.forEach((row) => sheet.addRow(row));

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = { bottom: { style: "thin", color: { argb: "FFE5E0D3" } } };
    });
  });

  await workbook.xlsx.write(res);
}

module.exports = { generateTableReportExcel };
