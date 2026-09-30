function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(columns, rows) {
  const getValue = (row, key) =>
    key.split('.').reduce((acc, part) => (acc === null || acc === undefined ? acc : acc[part]), row);

  const header = columns.map((c) => escapeCsvCell(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCsvCell(getValue(row, c.key))).join(','))
    .join('\r\n');

  return `\uFEFF${header}\r\n${body}`;
}

module.exports = { toCsv, escapeCsvCell };
