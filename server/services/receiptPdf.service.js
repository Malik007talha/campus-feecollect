import PDFDocument from 'pdfkit';
import { monthLabel } from '../utils/dates.js';

const W = 419.53; // A5 in points
const H = 595.28;
const M = 30;
const CW = W - M * 2;

const C = { navy: '#14284B', text: '#1f2937', muted: '#5b6472', line: '#9ca3af', light: '#eef2f7' };
const METHODS = { cash: 'Cash', bank_transfer: 'Bank transfer', cheque: 'Cheque', other: 'Other' };

const rs = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK')}`;
const dateText = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' }).replace(/\//g, '-') : '-';

function fit(doc, text, width) {
  let s = String(text ?? '');
  if (doc.widthOfString(s) <= width) return s;
  while (s.length > 1 && doc.widthOfString(`${s}...`) > width) s = s.slice(0, -1);
  return `${s}...`;
}

function txt(doc, text, x, y, { size = 10, bold = false, color = C.text, width, align = 'left' } = {}) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color);
  const s = width ? fit(doc, text, width) : String(text ?? '');
  doc.text(s, x, y, { width, align, lineBreak: false });
}

function row(doc, label, value, y, bold = false) {
  txt(doc, label, M, y, { size: 9, color: C.muted });
  txt(doc, value, M + 112, y, { size: 10, bold, width: CW - 112 });
}

function rule(doc, y) {
  doc.lineWidth(0.5).strokeColor(C.line).moveTo(M, y).lineTo(W - M, y).stroke();
}

function drawReceipt(doc, p, s) {
  doc.lineWidth(0.8).strokeColor(C.navy).rect(14, 14, W - 28, H - 28).stroke();

  // Header
  const initial = (s.schoolName.trim()[0] || 'S').toUpperCase();
  doc.lineWidth(1).strokeColor(C.navy).circle(M + 16, 50, 15).stroke();
  txt(doc, initial, M + 2, 42, { size: 14, bold: true, color: C.navy, width: 28, align: 'center' });
  txt(doc, s.schoolName, M + 42, 36, { size: 15, bold: true, color: C.navy, width: CW - 42 });
  const contact = [s.address, s.phone].filter(Boolean).join('   |   ');
  if (contact) txt(doc, contact, M + 42, 56, { size: 7.5, color: C.muted, width: CW - 42 });
  rule(doc, 76);

  txt(doc, 'PAYMENT RECEIPT', M, 88, { size: 13, bold: true, color: C.navy, width: CW, align: 'center' });
  row(doc, 'Receipt no.', p.receiptNo, 116, true);
  row(doc, 'Payment date', dateText(p.date), 132);
  rule(doc, 152);

  // Student and voucher
  row(doc, 'Student', p.studentName, 164, true);
  row(doc, 'Roll no.', p.rollNo, 180);
  row(doc, 'Class', `${p.className} - Section ${p.section}`, 196);
  row(doc, 'Voucher no.', p.voucherNo, 212);
  row(doc, 'Billing month', monthLabel(p.month), 228);

  // Amount
  doc.lineWidth(0.5).rect(M, 252, CW, 58).fillAndStroke(C.light, C.line);
  txt(doc, 'Amount received', M, 260, { size: 9, color: C.muted, width: CW, align: 'center' });
  txt(doc, rs(p.amount), M, 276, { size: 22, bold: true, color: C.navy, width: CW, align: 'center' });

  // Summary
  row(doc, 'Payment method', METHODS[p.method] ?? p.method, 328);
  row(doc, 'Voucher total payable', rs(p.voucherTotal), 344);
  row(doc, 'Total paid so far', rs(p.paidAfter), 360);
  row(doc, 'Balance remaining', rs(p.balanceAfter), 376, true);

  // Status
  const settled = p.balanceAfter === 0;
  doc.lineWidth(0.8).rect(M, 400, CW, 24).stroke(settled ? '#15803d' : '#b45309');
  txt(doc, settled ? 'PAID IN FULL' : `PARTIAL PAYMENT - ${rs(p.balanceAfter)} still to pay`, M, 407, {
    size: 10,
    bold: true,
    color: settled ? '#15803d' : '#b45309',
    width: CW,
    align: 'center',
  });

  if (p.note) row(doc, 'Note', p.note, 438);

  // Signature area
  rule(doc, H - 96);
  txt(doc, 'Received by', M, H - 90, { size: 8, color: C.muted });
  txt(doc, p.receivedByName, M, H - 78, { size: 10, bold: true, width: CW / 2 });
  doc.lineWidth(0.5).strokeColor(C.line).moveTo(W - M - 130, H - 72).lineTo(W - M, H - 72).stroke();
  txt(doc, 'Stamp and signature', W - M - 130, H - 66, { size: 7.5, color: C.muted });

  txt(doc, 'Computer-generated receipt. Please keep it for your records.', M, H - 40, {
    size: 7.5,
    color: C.muted,
    width: CW,
    align: 'center',
  });
}

// Resolves with a one-page receipt as a Buffer.
export function buildReceiptPdf(payment, settings) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [W, H],
      margin: 0,
      info: { Title: `Receipt ${payment.receiptNo}`, Author: settings.schoolName },
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      drawReceipt(doc, payment, settings);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}