import Voucher from '../models/Voucher.js';
import { refreshFines } from './fine.service.js';
import { pkDateString } from '../utils/fine.js';
import { escapeRegex } from '../utils/escapeRegex.js';

export const MAX_REMINDERS = 100;

// A defaulter voucher = still owes money AND the due date was before today (Pakistan time).
export function overdueFilter(q = {}, now = new Date()) {
  const startOfToday = new Date(`${pkDateString(now)}T00:00:00+05:00`);
  const filter = { status: { $in: ['unpaid', 'partial'] }, dueDate: { $lt: startOfToday } };

  if (q.month) filter.month = q.month;
  if (q.className) filter.className = q.className;
  if (q.section) filter.section = q.section.toUpperCase();
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    const or = [{ voucherNo: rx }, { studentName: rx }, { rollNo: rx }, { parentName: rx }];
    const digits = q.search.replace(/\D/g, '');
    if (digits.length >= 3) or.push({ parentPhone: new RegExp(escapeRegex(digits)) });
    filter.$or = or;
  }
  return filter;
}

// Minimum balance (total - paid)
export const balanceFilter = (min) =>
  min > 0 ? { $expr: { $gte: [{ $subtract: ['$total', '$paid'] }, min] } } : {};

// Ids of every defaulter voucher matching the filters (one more than the limit, so callers can tell it is too many).
export async function findDefaulterIds(q) {
  const base = overdueFilter(q);
  await refreshFines(base);
  const found = await Voucher.find({ ...base, ...balanceFilter(q.minBalance) })
    .select('_id')
    .sort({ dueDate: 1, voucherNo: 1 })
    .limit(MAX_REMINDERS + 1)
    .lean();
  return found.map((v) => v._id);
}