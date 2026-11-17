import PDFDocument from 'pdfkit';
import { monthLabel } from '../utils/dates.js';

const PAGE_W = 595.28; // A4 in points
const M = 20;
const W = PAGE_W - M * 2;
const COPY_H = 260; // three copies + two gaps fit exactly on one A4 page
const GAP = 10;

const C = { navy: '#14284B', text: '#1f2937', muted: '#5b6472', line: '#9ca3af', light: '#eef2f7' };
const COPIES = ['BANK COPY', 'SCHOOL COPY', 'STUDENT COPY'];
const STATUS = { unpaid: 'Unpaid', partial: 'Partly paid', paid: 'Paid' };
const DEFAULT_INSTRUCTIONS = 'Please pay on or before the due date. Late fines may apply after the due date. Keep the student copy as your record.';

const rs = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK')}`;
const dateText = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' }).replace(/\//g, '-') : '-';

// Shortens text with "..." so it never runs outside its box.
function fit(doc, text, width) {
  let s = String(text ?? '');
  if (doc.widthOfString(s) <= width) return s;
  while (s.length > 1 && doc.widthOfString(`${s}...`) > width) s = s.slice(0, -1);
  return `${s}...`;
}

function txt(doc, text, x, y, { size = 8.5, bold = false, color = C.text, width, align = 'left' } = {}) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color);
  const s = width ? fit(doc, text, width) : String(text ?? '');
  doc.text(s, x, y, { width, align, lineBreak: false });
}

function drawCopy(doc, v, s, label, y0) {
  const x0 = M;
  const items = v.items ?? [];
  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const balance = v.total - v.paid;

  doc.lineWidth(0.8).strokeColor(C.navy).rect(x0, y0, W, COPY_H).stroke();

  /* Header: logo placeholder, school name, copy label */
  const initial = (s.schoolName.trim()[0] || 'S').toUpperCase();
  doc.lineWidth(1).strokeColor(C.navy).circle(x0 + 24, y0 + 21, 14).stroke();
  txt(doc, initial, x0 + 10, y0 + 13, { size: 14, bold: true, color: C.navy, width: 28, align: 'center' });
  txt(doc, s.schoolName, x0 + 46, y0 + 8, { size: 14, bold: true, color: C.navy, width: W - 46 - 130 });
  const contact = [s.address, s.phone].filter(Boolean).join('   |   ');
  if (contact) txt(doc, contact, x0 + 46, y0 + 26, { size: 7.5, color: C.muted, width: W - 46 - 130 });

  doc.lineWidth(1).strokeColor(C.navy).rect(x0 + W - 120, y0 + 9, 110, 22).stroke();
  txt(doc, label, x0 + W - 120, y0 + 16, { size: 10, bold: true, color: C.navy, width: 110, align: 'center' });
  doc.lineWidth(0.5).strokeColor(C.line).moveTo(x0, y0 + 41).lineTo(x0 + W, y0 + 41).stroke();

  /* Student and voucher details */
  const left = [
    ['Student', v.studentName],
    ['Roll no.', v.rollNo],
    ['Class', `${v.className} - Section ${v.section}`],
    ['Parent', v.parentName || '-'],
  ];
  const right = [
    ['Voucher no.', v.voucherNo],
    ['Billing month', monthLabel(v.month)],
    ['Due date', dateText(v.dueDate)],
    ['Status', STATUS[v.status] ?? v.status],
  ];
  left.forEach(([l, val], i) => {
    const y = y0 + 48 + i * 13;
    txt(doc, l, x0 + 10, y, { size: 8, color: C.muted });
    txt(doc, val, x0 + 68, y, { bold: true, width: 232 });
  });
  right.forEach(([l, val], i) => {
    const y = y0 + 48 + i * 13;
    txt(doc, l, x0 + 318, y, { size: 8, color: C.muted });
    txt(doc, val, x0 + 384, y, { bold: true, width: W - 384 - 8 });
  });

  /* Fee table (left) */
  const tableTop = y0 + 108;
  const tableBottom = y0 + COPY_H - 22;
  const rows = items.map((i) => ({ label: i.head, value: rs(i.amount) }));
  if (v.discount > 0 || v.fine > 0) rows.push({ label: 'Total fees', value: rs(subtotal), bold: true });
  if (v.discount > 0) rows.push({ label: 'Less: Discount', value: `- ${rs(v.discount)}` });
  if (v.fine > 0) rows.push({ label: 'Add: Late fine', value: `+ ${rs(v.fine)}` });
  rows.push({ label: 'Total payable', value: rs(v.total), bold: true, shaded: true });

  const rowH = Math.min(14, (tableBottom - tableTop) / (rows.length + 1));
  const fs = Math.min(8.5, rowH - 3.5);
  const tx = x0 + 10;
  const tw = 302;
  const textY = (y) => y + (rowH - fs) / 2 - 0.5;

  doc.lineWidth(0.5).rect(tx, tableTop, tw, rowH).fillAndStroke(C.light, C.line);
  txt(doc, 'Fee description', tx + 5, textY(tableTop), { size: fs, bold: true, color: C.navy });
  txt(doc, 'Amount', tx, textY(tableTop), { size: fs, bold: true, color: C.navy, width: tw - 5, align: 'right' });

  rows.forEach((r, i) => {
    const y = tableTop + rowH * (i + 1);
    doc.lineWidth(0.5);
    if (r.shaded) doc.rect(tx, y, tw, rowH).fillAndStroke(C.light, C.line);
    else doc.rect(tx, y, tw, rowH).strokeColor(C.line).stroke();
    txt(doc, r.label, tx + 5, textY(y), { size: fs, bold: r.bold, width: tw - 110 });
    txt(doc, r.value, tx, textY(y), { size: fs, bold: r.bold, width: tw - 5, align: 'right' });
  });

  /* Payment summary (right) */
  const sx = x0 + 326;
  const sw = W - 326 - 10;
  [
    ['Total payable', rs(v.total), false],
    ['Amount paid', rs(v.paid), false],
    ['Remaining balance', rs(balance), true],
  ].forEach(([l, val, strong], i) => {
    const y = tableTop + i * 18;
    doc.lineWidth(0.5);
    if (strong) doc.rect(sx, y, sw, 18).fillAndStroke(C.light, C.line);
    else doc.rect(sx, y, sw, 18).strokeColor(C.line).stroke();
    txt(doc, l, sx + 6, y + 5, { size: 8.5, bold: strong });
    txt(doc, val, sx, y + (strong ? 4 : 4.5), { size: strong ? 10 : 9, bold: true, width: sw - 6, align: 'right' });
  });

  /* Payment instructions */
  const iy = tableTop + 60;
  txt(doc, 'Payment instructions', sx, iy, { size: 8, bold: true, color: C.navy });
  const lines = [];
  if (s.bankName) lines.push(`Bank: ${s.bankName}`);
  if (s.accountTitle) lines.push(`Account title: ${s.accountTitle}`);
  if (s.accountNumber) lines.push(`Account no.: ${s.accountNumber}`);
  lines.push(s.paymentInstructions || DEFAULT_INSTRUCTIONS);
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(C.text)
    .text(lines.join('\n'), sx, iy + 11, {
      width: sw,
      height: y0 + COPY_H - 26 - (iy + 11),
      ellipsis: true,
    });

  /* Footer */
  doc.lineWidth(0.5).strokeColor(C.line).moveTo(sx, y0 + COPY_H - 17).lineTo(sx + 110, y0 + COPY_H - 17).stroke();
  txt(doc, 'Stamp and signature', sx, y0 + COPY_H - 14, { size: 7, color: C.muted });
  txt(doc, 'Computer-generated fee voucher', tx, y0 + COPY_H - 14, { size: 7, color: C.muted });
}

function drawPage(doc, voucher, settings) {
  COPIES.forEach((label, i) => drawCopy(doc, voucher, settings, label, M + i * (COPY_H + GAP)));

  // dashed cut lines between the copies
  [0, 1].forEach((i) => {
    const y = M + COPY_H + GAP / 2 + i * (COPY_H + GAP);
    doc.save().lineWidth(0.6).strokeColor(C.muted).dash(4, { space: 3 }).moveTo(M, y).lineTo(PAGE_W - M, y).stroke().undash().restore();
  });
}

// One A4 page per voucher. Resolves with the finished PDF as a Buffer.
export function buildVouchersPdf(vouchers, settings) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      autoFirstPage: false,
      info: { Title: 'Fee Voucher', Author: settings.schoolName },
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      for (const voucher of vouchers) {
        doc.addPage();
        drawPage(doc, voucher, settings);
      }
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}