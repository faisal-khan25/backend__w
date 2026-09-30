const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(__dirname, '..', '..', 'uploads');
const PAYSLIPS_DIR = path.join(UPLOAD_ROOT, 'payroll');
fs.mkdirSync(PAYSLIPS_DIR, { recursive: true });

const COMPANY_NAME = process.env.COMPANY_NAME || 'Union Workspace Pvt. Ltd.';
const COMPANY_ADDRESS =
  process.env.COMPANY_ADDRESS || '4th Floor, Union Business Park, Bengaluru, Karnataka, India';
const COMPANY_LOGO_PATH = process.env.COMPANY_LOGO_PATH || null;

function money(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthLabel(month, year) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function row(doc, x1, x2, y, label, value, opts = {}) {
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 10);
  doc.text(label, x1, y);
  doc.text(value, x2, y, { width: 150, align: 'right' });
}

function generatePayslipPdf({ payroll, employee, payslipNumber }) {
  const fileName = `payslip-${payroll.id}.pdf`;
  const filePath = path.join(PAYSLIPS_DIR, fileName);

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  let headerX = 40;
  if (COMPANY_LOGO_PATH && fs.existsSync(COMPANY_LOGO_PATH)) {
    try {
      doc.image(COMPANY_LOGO_PATH, 40, 35, { width: 48, height: 48 });
      headerX = 96;
    } catch {
    }
  }
  doc.font('Helvetica-Bold').fontSize(16).text(COMPANY_NAME, headerX, 40);
  doc.font('Helvetica').fontSize(9).fillColor('#555').text(COMPANY_ADDRESS, headerX, 60, { width: 400 });
  doc.fillColor('#000');

  doc.moveTo(40, 95).lineTo(555, 95).strokeColor('#ddd').stroke();

  doc.font('Helvetica-Bold').fontSize(13).text(`Payslip for ${monthLabel(payroll.month, payroll.year)}`, 40, 105);

  const profile = employee.EmployeeProfile || {};
  let y = 130;
  const empLines = [
    ['Employee Name', employee.getFullName ? employee.getFullName() : `${employee.firstName} ${employee.lastName || ''}`],
    ['Employee ID', profile.employeeCode || employee.id],
    ['Department', employee.department || '-'],
    ['Designation', profile.designation || '-'],
    ['Date of Joining', profile.dateOfJoining || '-'],
  ];
  empLines.forEach(([label, value]) => {
    row(doc, 40, 300, y, `${label}:`, String(value));
    y += 16;
  });

  y += 14;
  const colLeftX = 40;
  const colRightX = 300;
  const tableTop = y;

  doc.font('Helvetica-Bold').fontSize(11);
  doc.text('Earnings', colLeftX, tableTop);
  doc.text('Deductions', colRightX, tableTop);
  doc.moveTo(colLeftX, tableTop + 16).lineTo(255, tableTop + 16).strokeColor('#ddd').stroke();
  doc.moveTo(colRightX, tableTop + 16).lineTo(515, tableTop + 16).strokeColor('#ddd').stroke();

  const earnings = [
    ['Basic Salary', payroll.basicSalary],
    ['HRA', payroll.hra],
    ['Other Allowances', payroll.otherAllowances],
  ];
  if (Number(payroll.otherEarnings) > 0) earnings.push(['Other Earnings', payroll.otherEarnings]);

  const deductions = [
    ['PF', payroll.pf],
    ['Professional Tax', payroll.professionalTax],
    ['TDS', payroll.tds],
    ['LOP', payroll.lopAmount],
    ['Insurance', payroll.insurance],
    ['Loan Recovery', payroll.loanRecovery],
    ['Salary Advance', payroll.salaryAdvance],
    ['Other Deductions', payroll.otherDeductions],
  ].filter(([, amt]) => Number(amt) !== 0 || true);

  let ey = tableTop + 26;
  earnings.forEach(([label, amt]) => {
    row(doc, colLeftX, colLeftX + 105, ey, label, money(amt));
    ey += 16;
  });
  ey += 4;
  row(doc, colLeftX, colLeftX + 105, ey, 'Gross Salary', money(payroll.grossSalary), { bold: true });

  let dy = tableTop + 26;
  deductions.forEach(([label, amt]) => {
    row(doc, colRightX, colRightX + 155, dy, label, money(amt));
    dy += 16;
  });

  const afterTablesY = Math.max(ey, dy) + 20;

  doc.moveTo(40, afterTablesY).lineTo(555, afterTablesY).strokeColor('#ddd').stroke();
  let sy = afterTablesY + 12;
  row(doc, 40, 460, sy, 'Total Earnings', money(payroll.totalEarnings));
  sy += 16;
  row(doc, 40, 460, sy, 'Total Deductions', money(payroll.totalDeductions));
  sy += 16;
  doc.font('Helvetica-Bold').fontSize(12);
  row(doc, 40, 460, sy, 'Net Salary', money(payroll.netSalary), { bold: true, size: 12 });
  sy += 26;

  doc.moveTo(40, sy).lineTo(555, sy).strokeColor('#ddd').stroke();
  sy += 12;
  doc.font('Helvetica-Bold').fontSize(11).text('Payment Details', 40, sy);
  sy += 18;
  const paymentLines = [
    ['Payroll ID', payroll.id],
    ['Payslip Number', payslipNumber],
    ['Payment Status', payroll.paymentStatus],
    ['Payment Date', payroll.paymentDate || 'Not yet paid'],
    ['Payment Reference', payroll.paymentReference || '-'],
  ];
  paymentLines.forEach(([label, value]) => {
    row(doc, 40, 300, sy, `${label}:`, String(value));
    sy += 16;
  });

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#888')
    .text(
      'This is a system-generated payslip. Generation of this document does not by itself confirm that funds have been transferred; see Payment Status above.',
      40,
      760,
      { width: 515 }
    );

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { generatePayslipPdf, PAYSLIPS_DIR };
