import Voucher from '../models/Voucher.js';
import Payment from '../models/Payment.js';
import Student from '../models/Student.js';
import { overdueFilter } from './defaulter.service.js';
import { currentMonthKey, monthLabel, dueDateToDate } from '../utils/dates.js';
import { pkDateString, daysLate } from '../utils/fine.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { ApiError } from '../utils/ApiError.js';

const TZ = 'Asia/Karachi';
const MAX_ROWS = 2000;
const NATURAL = { locale: 'en', strength: 2, numericOrdering: true };
const METHODS = { cash: 'Cash', bank_transfer: 'Bank transfer', cheque: 'Cheque', other: 'Other' };
const STATUS = { unpaid: 'Unpaid', partial: 'Partly paid', paid: 'Paid' };
const DISCOUNT_TYPES = { none: '—', sibling: 'Sibling', scholarship: 'Scholarship' };

const col = (key, label, type = 'text') => ({ key, label, type });
const dmy = (s) => s.split('-').reverse().join('-');
const classText = (name, section) => `${name} – ${section}`;
const itemsTotal = (items) => items.reduce((sum, i) => sum + i.amount, 0);
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const sumBy = (rows, keys) =>
  Object.fromEntries(keys.map((k) => [k, rows.reduce((sum, r) => sum + (Number(r[k]) || 0), 0)]));
const phoneText = (p) => (p && /^03\d{9}$/.test(p) ? `${p.slice(0, 4)}-${p.slice(4)}` : p || '');

// month / class / section filter for vouchers
function voucherScope(q) {
  const f = {};
  if (q.month) f.month = q.month;
  if (q.className) f.className = q.className;
  if (q.section) f.section = q.section.toUpperCase();
  return f;
}

function scopeLines(q) {
  const lines = [];
  if (q.month) lines.push(`Month: ${monthLabel(q.month)}`);
  if (q.className) lines.push(`Class: ${q.className}${q.section ? ` – Section ${q.section.toUpperCase()}` : ''}`);
  else if (q.section) lines.push(`Section: ${q.section.toUpperCase()}`);
  return lines;
}

// Reads up to MAX_ROWS rows, and says whether there were more.
async function limited(query) {
  const docs = await query.limit(MAX_ROWS + 1).lean();
  return { docs: docs.slice(0, MAX_ROWS), truncated: docs.length > MAX_ROWS };
}

/* ------------------------------------- Reports ------------------------------------- */

const REPORTS = {
  // Money received each day in a date range
  async collection(q) {
    const from = q.from ?? `${currentMonthKey()}-01`;
    const to = q.to ?? pkDateString(new Date());

    const match = { date: { $gte: dueDateToDate(from), $lt: new Date(dueDateToDate(to).getTime() + 86400000) } };
    if (q.className) match.className = q.className;
    if (q.section) match.section = q.section.toUpperCase();

    const by = (m) => ({ $sum: { $cond: [{ $eq: ['$method', m] }, '$amount', 0] } });
    const groups = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: TZ } },
          payments: { $sum: 1 },
          cash: by('cash'),
          bank_transfer: by('bank_transfer'),
          cheque: by('cheque'),
          other: by('other'),
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const rows = groups.map((g) => ({
      date: `${g._id}T00:00:00+05:00`,
      payments: g.payments,
      cash: g.cash,
      bank_transfer: g.bank_transfer,
      cheque: g.cheque,
      other: g.other,
      total: g.total,
    }));
    const totals = sumBy(rows, ['payments', 'cash', 'bank_transfer', 'cheque', 'other', 'total']);

    return {
      title: 'Monthly fee collection',
      filters: [`From ${dmy(from)} to ${dmy(to)}`, ...scopeLines({ className: q.className, section: q.section })],
      columns: [
        col('date', 'Date', 'date'),
        col('payments', 'Payments', 'number'),
        col('cash', 'Cash', 'money'),
        col('bank_transfer', 'Bank transfer', 'money'),
        col('cheque', 'Cheque', 'money'),
        col('other', 'Other', 'money'),
        col('total', 'Total received', 'money'),
      ],
      rows,
      totals,
      summary: [
        { label: 'Total received', value: totals.total, type: 'money' },
        { label: 'Payments', value: totals.payments, type: 'number' },
        { label: 'Days with payments', value: rows.length, type: 'number' },
      ],
      truncated: false,
    };
  },

  // Every unpaid or partly paid voucher
  async pending(q) {
    const filter = { status: { $in: ['unpaid', 'partial'] }, ...voucherScope(q) };
    const { docs, truncated } = await limited(
      Voucher.find(filter).sort({ className: 1, section: 1, rollNo: 1 }).collation(NATURAL)
    );

    const rows = docs.map((v) => ({
      voucherNo: v.voucherNo,
      studentName: v.studentName,
      rollNo: v.rollNo,
      class: classText(v.className, v.section),
      month: monthLabel(v.month),
      dueDate: v.dueDate,
      status: STATUS[v.status],
      total: v.total,
      paid: v.paid,
      balance: v.total - v.paid,
    }));
    const totals = sumBy(rows, ['total', 'paid', 'balance']);
    const overdue = docs.reduce((sum, v) => (daysLate(v.dueDate) > 0 ? sum + (v.total - v.paid) : sum), 0);

    return {
      title: 'Pending fee report',
      filters: scopeLines(q).length ? scopeLines(q) : ['All months and classes'],
      columns: [
        col('voucherNo', 'Voucher no.'),
        col('studentName', 'Student'),
        col('rollNo', 'Roll no.'),
        col('class', 'Class'),
        col('month', 'Month'),
        col('dueDate', 'Due date', 'date'),
        col('status', 'Status'),
        col('total', 'Total payable', 'money'),
        col('paid', 'Paid', 'money'),
        col('balance', 'Balance', 'money'),
      ],
      rows,
      totals,
      summary: [
        { label: 'Vouchers with a balance', value: rows.length, type: 'number' },
        { label: 'Total pending', value: totals.balance, type: 'money' },
        { label: 'Of which overdue', value: overdue, type: 'money' },
      ],
      truncated,
    };
  },

  // Billed, discounts, fines, collected and pending for each class and section
  async classwise(q) {
    const month = q.month ?? currentMonthKey();
    const groups = await Voucher.aggregate([
      { $match: voucherScope({ ...q, month }) },
      {
        $group: {
          _id: { className: '$className', section: '$section' },
          vouchers: { $sum: 1 },
          fees: { $sum: { $subtract: [{ $add: ['$total', '$discount'] }, '$fine'] } },
          discount: { $sum: '$discount' },
          fine: { $sum: '$fine' },
          total: { $sum: '$total' },
          paid: { $sum: '$paid' },
        },
      },
      { $sort: { '_id.className': 1, '_id.section': 1 } },
    ]).collation(NATURAL);

    const rows = groups.map((g) => ({
      className: g._id.className,
      section: g._id.section,
      vouchers: g.vouchers,
      fees: g.fees,
      discount: g.discount,
      fine: g.fine,
      total: g.total,
      paid: g.paid,
      pending: g.total - g.paid,
      percent: pct(g.paid, g.total),
    }));
    const totals = sumBy(rows, ['vouchers', 'fees', 'discount', 'fine', 'total', 'paid', 'pending']);
    totals.percent = pct(totals.paid, totals.total);

    return {
      title: 'Class-wise collection report',
      filters: scopeLines({ ...q, month }),
      columns: [
        col('className', 'Class'),
        col('section', 'Section'),
        col('vouchers', 'Vouchers', 'number'),
        col('fees', 'Fees', 'money'),
        col('discount', 'Discounts', 'money'),
        col('fine', 'Late fines', 'money'),
        col('total', 'Total payable', 'money'),
        col('paid', 'Collected', 'money'),
        col('pending', 'Pending', 'money'),
        col('percent', 'Collected %', 'percent'),
      ],
      rows,
      totals,
      summary: [
        { label: 'Total payable', value: totals.total, type: 'money' },
        { label: 'Collected', value: totals.paid, type: 'money' },
        { label: 'Pending', value: totals.pending, type: 'money' },
        { label: 'Collected', value: totals.percent, type: 'percent' },
      ],
      truncated: false,
    };
  },

  // Every payment for the students that match a search
  async history(q) {
    if (!q.search || q.search.length < 2) {
      throw ApiError.badRequest("Type a student's name, roll number or voucher number to see payment history");
    }
    const rx = new RegExp(escapeRegex(q.search), 'i');
    const match = { $or: [{ studentName: rx }, { rollNo: rx }, { voucherNo: rx }, { receiptNo: rx }] };
    if (q.from || q.to) {
      match.date = {};
      if (q.from) match.date.$gte = dueDateToDate(q.from);
      if (q.to) match.date.$lt = new Date(dueDateToDate(q.to).getTime() + 86400000);
    }
    if (q.className) match.className = q.className;
    if (q.section) match.section = q.section.toUpperCase();

    const { docs, truncated } = await limited(Payment.find(match).sort({ date: 1, createdAt: 1 }));
    const rows = docs.map((p) => ({
      date: p.date,
      receiptNo: p.receiptNo,
      studentName: p.studentName,
      class: `${classText(p.className, p.section)} · Roll ${p.rollNo}`,
      voucherNo: p.voucherNo,
      month: monthLabel(p.month),
      method: METHODS[p.method] ?? p.method,
      amount: p.amount,
      balanceAfter: p.balanceAfter,
      receivedByName: p.receivedByName,
    }));
    const totals = sumBy(rows, ['amount']);

    const lines = [`Search: "${q.search}"`];
    if (q.from || q.to) lines.push(`Dates: ${q.from ? dmy(q.from) : 'start'} to ${q.to ? dmy(q.to) : 'today'}`);
    lines.push(...scopeLines({ className: q.className, section: q.section }));

    return {
      title: 'Student payment history',
      filters: lines,
      columns: [
        col('date', 'Date', 'date'),
        col('receiptNo', 'Receipt no.'),
        col('studentName', 'Student'),
        col('class', 'Class'),
        col('voucherNo', 'Voucher'),
        col('month', 'Month'),
        col('method', 'Method'),
        col('amount', 'Amount', 'money'),
        col('balanceAfter', 'Balance after', 'money'),
        col('receivedByName', 'Received by'),
      ],
      rows,
      totals,
      summary: [
        { label: 'Payments', value: rows.length, type: 'number' },
        { label: 'Total paid', value: totals.amount, type: 'money' },
        { label: 'Students', value: new Set(docs.map((p) => String(p.student))).size, type: 'number' },
      ],
      truncated,
    };
  },

  // Overdue vouchers with parent contact details
  async defaulters(q) {
    const filter = overdueFilter({ month: q.month, className: q.className, section: q.section });
    const { docs, truncated } = await limited(Voucher.find(filter).sort({ dueDate: 1, voucherNo: 1 }));

    const rows = docs.map((v) => ({
      studentName: v.studentName,
      class: `${classText(v.className, v.section)} · Roll ${v.rollNo}`,
      parentName: v.parentName || '',
      parentPhone: phoneText(v.parentPhone),
      voucherNo: v.voucherNo,
      month: monthLabel(v.month),
      dueDate: v.dueDate,
      days: daysLate(v.dueDate),
      total: v.total,
      paid: v.paid,
      fine: v.fine,
      balance: v.total - v.paid,
    }));
    const totals = sumBy(rows, ['total', 'paid', 'fine', 'balance']);

    return {
      title: 'Defaulter report',
      filters: scopeLines(q).length ? scopeLines(q) : ['All months and classes'],
      columns: [
        col('studentName', 'Student'),
        col('class', 'Class'),
        col('parentName', 'Parent'),
        col('parentPhone', 'Phone'),
        col('voucherNo', 'Voucher'),
        col('month', 'Month'),
        col('dueDate', 'Due date', 'date'),
        col('days', 'Days overdue', 'number'),
        col('total', 'Total payable', 'money'),
        col('paid', 'Paid', 'money'),
        col('fine', 'Late fine', 'money'),
        col('balance', 'Balance', 'money'),
      ],
      rows,
      totals,
      summary: [
        { label: 'Overdue vouchers', value: rows.length, type: 'number' },
        { label: 'Students', value: new Set(docs.map((v) => String(v.student))).size, type: 'number' },
        { label: 'Total outstanding', value: totals.balance, type: 'money' },
        { label: 'Late fines included', value: totals.fine, type: 'money' },
      ],
      truncated,
    };
  },

  // Vouchers that carry a discount
  async discounts(q) {
    const filter = { discount: { $gt: 0 }, ...voucherScope(q) };
    const { docs, truncated } = await limited(
      Voucher.find(filter)
        .select('student studentName rollNo className section month items discount')
        .sort({ className: 1, section: 1, rollNo: 1 })
        .collation(NATURAL)
    );

    const students = await Student.find({ _id: { $in: docs.map((d) => d.student) } })
      .select('discountType')
      .lean();
    const typeOf = new Map(students.map((s) => [String(s._id), s.discountType]));

    const rows = docs.map((v) => {
      const fees = itemsTotal(v.items);
      return {
        studentName: v.studentName,
        rollNo: v.rollNo,
        class: classText(v.className, v.section),
        month: monthLabel(v.month),
        type: DISCOUNT_TYPES[typeOf.get(String(v.student))] ?? '—',
        fees,
        percent: pct(v.discount, fees),
        discount: v.discount,
        after: fees - v.discount,
      };
    });
    const totals = sumBy(rows, ['fees', 'discount', 'after']);
    totals.percent = pct(totals.discount, totals.fees);
    const typeTotal = (label) => rows.filter((r) => r.type === label).reduce((sum, r) => sum + r.discount, 0);

    return {
      title: 'Discount report',
      filters: scopeLines(q).length ? scopeLines(q) : ['All months and classes'],
      columns: [
        col('studentName', 'Student'),
        col('rollNo', 'Roll no.'),
        col('class', 'Class'),
        col('month', 'Month'),
        col('type', 'Discount type'),
        col('fees', 'Fees before discount', 'money'),
        col('percent', 'Discount %', 'percent'),
        col('discount', 'Discount', 'money'),
        col('after', 'Fees after discount', 'money'),
      ],
      rows,
      totals,
      summary: [
        { label: 'Vouchers with a discount', value: rows.length, type: 'number' },
        { label: 'Total discount', value: totals.discount, type: 'money' },
        { label: 'Sibling discounts', value: typeTotal('Sibling'), type: 'money' },
        { label: 'Scholarships', value: typeTotal('Scholarship'), type: 'money' },
      ],
      truncated,
    };
  },
};

export const buildReport = (type, query) => (REPORTS[type] ? REPORTS[type](query) : null);