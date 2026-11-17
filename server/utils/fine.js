const TIMEZONE = 'Asia/Karachi';

// "2026-11-17": the calendar date in Pakistan for any moment in time
export const pkDateString = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

const dayNumber = (text) => {
  const [y, m, d] = text.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};

// 0 on the due date itself, 1 on the day after, and so on (negative before the due date)
export const daysLate = (dueDate, now = new Date()) =>
  dayNumber(pkDateString(now)) - dayNumber(pkDateString(dueDate));

// policy = { type: 'none' | 'fixed' | 'per_day' | 'percent', amount, percent, graceDays, cap }
// Pure function: the same inputs always give the same fine, so it can never be applied twice.
export function calculateFine(voucher, policy, now = new Date()) {
  if (!policy || policy.type === 'none') return 0;

  const effectiveDays = daysLate(voucher.dueDate, now) - (policy.graceDays || 0);
  if (effectiveDays <= 0) return 0;

  const base = voucher.items.reduce((sum, i) => sum + i.amount, 0) - (voucher.discount || 0);

  let fine = 0;
  if (policy.type === 'fixed') fine = policy.amount || 0;
  else if (policy.type === 'per_day') fine = (policy.amount || 0) * effectiveDays;
  else if (policy.type === 'percent') fine = Math.round((base * (policy.percent || 0)) / 100);

  if (policy.cap > 0) fine = Math.min(fine, policy.cap);
  return Math.max(fine, 0);
}