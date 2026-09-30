const fs = require('fs');
const PDFDocument = require('pdfkit');

const COMPANY_LOGO_PATH = process.env.COMPANY_LOGO_PATH || null;

const COLORS = {
  brand: '#1f3a5f',
  border: '#c9d1dc',
  headerFill: '#eef2f7',
  muted: '#5b6675',
  text: '#111827',
  net: '#e8f3ec',
};

const L = 40;
const W = 515;

function money(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below1000(n) {
  const parts = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ''));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(' ');
}

function amountInWords(amount) {
  const rounded = Math.round(Number(amount || 0) * 100) / 100;
  let rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);
  if (rupees === 0 && paise === 0) return 'Rupees Zero Only';

  const segments = [];
  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;

  if (crore) segments.push(`${below1000(crore)} Crore`);
  if (lakh) segments.push(`${below1000(lakh)} Lakh`);
  if (thousand) segments.push(`${below1000(thousand)} Thousand`);
  if (rupees) segments.push(below1000(rupees));

  let words = `Rupees ${segments.join(' ') || 'Zero'}`;
  if (paise) words += ` and ${below1000(paise)} Paise`;
  return `${words} Only`;
}

function labelValue(doc, x, y, label, value, width) {
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted).text(label, x, y, { width, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text).text(String(value ?? '-'), x, y + 11, {
    width,
    lineBreak: false,
    ellipsis: true,
  });
}

function amountTable(doc, x, y, width, title, rows, totalLabel, totalValue, rowCount) {
  const rowH = 22;
  const head = 24;
  const bodyRows = Math.max(rows.length, rowCount);
  const totalH = 26;
  const height = head + bodyRows * rowH + totalH;

  doc.rect(x, y, width, height).lineWidth(0.8).strokeColor(COLORS.border).stroke();
  doc.rect(x, y, width, head).fill(COLORS.headerFill);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.brand).text(title.toUpperCase(), x + 10, y + 7, { lineBreak: false });
  doc.text('AMOUNT', x + width - 110, y + 7, { width: 100, align: 'right', lineBreak: false });

  rows.forEach(([label, amount], i) => {
    const ry = y + head + i * rowH;
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(label, x + 10, ry + 6, { lineBreak: false });
    doc.text(money(amount), x + width - 130, ry + 6, { width: 120, align: 'right', lineBreak: false });
    doc.moveTo(x, ry + rowH).lineTo(x + width, ry + rowH).lineWidth(0.4).strokeColor(COLORS.border).stroke();
  });

  const ty = y + head + bodyRows * rowH;
  doc.rect(x, ty, width, totalH).fill(COLORS.headerFill);
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.text).text(totalLabel, x + 10, ty + 8, { lineBreak: false });
  doc.text(money(totalValue), x + width - 130, ty + 8, { width: 120, align: 'right', lineBreak: false });
  return y + height;
}

function generateSalarySlipPdf(slip) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `Salary Slip ${slip.slipNumber}`,
        Author: slip.company.name,
        Subject: `Salary slip for ${slip.payPeriod.label}`,
      },
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(L, 40, W, 66).fill(COLORS.brand);
    let textX = L + 16;
    if (COMPANY_LOGO_PATH && fs.existsSync(COMPANY_LOGO_PATH)) {
      try {
        doc.image(COMPANY_LOGO_PATH, L + 12, 48, { fit: [50, 50] });
        textX = L + 72;
      } catch {
      }
    }
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff').text(slip.company.name, textX, 54, { width: 330, lineBreak: false, ellipsis: true });
    doc.font('Helvetica').fontSize(8.5).fillColor('#d6deea').text(slip.company.address, textX, 76, { width: 330, height: 24 });
    doc.font('Helvetica-Bold').fontSize(15).fillColor('#ffffff').text('SALARY SLIP', L + W - 160, 60, { width: 144, align: 'right', lineBreak: false });

    let y = 120;
    labelValue(doc, L, y, 'Salary Slip No.', slip.slipNumber, 190);
    labelValue(doc, L + 200, y, 'Payroll Month', slip.payPeriod.label, 150);
    labelValue(doc, L + 375, y, 'Generated On', fmtDate(slip.generatedAt), 140);

    y = 160;
    doc.rect(L, y, W, 84).lineWidth(0.8).strokeColor(COLORS.border).stroke();
    doc.rect(L, y, W, 20).fill(COLORS.headerFill);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.brand).text('EMPLOYEE INFORMATION', L + 10, y + 5, { lineBreak: false });
    const emp = slip.employee;
    labelValue(doc, L + 10, y + 28, 'Employee Name', emp.name, 235);
    labelValue(doc, L + 265, y + 28, 'Employee ID', emp.employeeId, 240);
    labelValue(doc, L + 10, y + 56, 'Department', emp.department || '-', 235);
    labelValue(doc, L + 265, y + 56, 'Designation', emp.designation || '-', 240);

    y = 258;
    const att = slip.attendance;
    const cells = [
      ['Working Days', att.workingDays],
      ['Present Days', att.presentDays],
      ['Paid Leave', att.paidLeaveDays],
      ['Unpaid Leave', att.unpaidLeaveDays],
      ['Absent Days', att.absentDays],
      ['LOP Days', att.lopDays],
    ];
    doc.rect(L, y, W, 46).lineWidth(0.8).strokeColor(COLORS.border).stroke();
    const cellW = W / cells.length;
    cells.forEach(([label, value], i) => {
      const cx = L + i * cellW;
      if (i > 0) doc.moveTo(cx, y).lineTo(cx, y + 46).lineWidth(0.4).strokeColor(COLORS.border).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(label, cx, y + 8, { width: cellW, align: 'center', lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.text).text(String(value), cx, y + 22, { width: cellW, align: 'center', lineBreak: false });
    });

    y = 322;
    const colW = 250;
    const e = slip.earnings;
    const d = slip.deductions;
    const earningRows = [
      ['Basic Salary', e.basicSalary],
      ['HRA', e.hra],
      ['Allowances', e.allowances],
      ['Bonus / Other Earnings', e.bonusOtherEarnings],
    ];
    const deductionRows = [
      ['Provident Fund (PF)', d.pf],
      ['ESI / Insurance', d.esi],
      ['Professional Tax', d.professionalTax],
      ['TDS', d.tds],
      ['Leave Without Pay (LOP)', d.lossOfPay],
      ['Other Deductions', d.other],
    ];
    const rowCount = Math.max(earningRows.length, deductionRows.length);
    const endY = amountTable(doc, L, y, colW, 'Earnings', earningRows, 'Gross Salary', e.grossSalary, rowCount);
    amountTable(doc, L + W - colW, y, colW, 'Deductions', deductionRows, 'Total Deductions', d.totalDeductions, rowCount);

    y = endY + 22;
    doc.rect(L, y, W, 78).fill(COLORS.net);
    doc.rect(L, y, W, 78).lineWidth(0.8).strokeColor(COLORS.border).stroke();
    doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.muted).text(
      `Gross Salary ${money(e.grossSalary)}  -  Total Deductions ${money(d.totalDeductions)}`,
      L + 14, y + 12, { width: W - 28, lineBreak: false }
    );
    doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.text).text('NET SALARY', L + 14, y + 32, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(17).fillColor(COLORS.brand).text(money(slip.netSalary), L + W - 224, y + 30, { width: 210, align: 'right', lineBreak: false });
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLORS.muted).text(amountInWords(slip.netSalary), L + 14, y + 58, { width: W - 28, lineBreak: false, ellipsis: true });

    y += 96;
    const paid = slip.payment.status === 'PAID';
    labelValue(doc, L, y, 'Payment Status', paid ? 'Paid' : 'Not yet paid', 160);
    labelValue(doc, L + 200, y, 'Payment Date', paid ? fmtDate(slip.payment.date) : '-', 150);
    labelValue(doc, L + 375, y, 'Payment Reference', slip.payment.reference || '-', 140);

    doc.moveTo(L, 760).lineTo(L + W, 760).lineWidth(0.5).strokeColor(COLORS.border).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(
      `This is a system-generated salary slip and does not require a signature. Slip ${slip.slipNumber} generated on ${fmtDate(slip.generatedAt)}.`,
      L, 768, { width: W, align: 'center', lineBreak: false }
    );

    doc.end();
  });
}

module.exports = { generateSalarySlipPdf, amountInWords };
