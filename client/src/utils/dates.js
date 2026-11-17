const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  
  // "2026-11" for the current month in Pakistan time
  export function currentMonthKey() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date());
    return `${parts.find((p) => p.type === 'year').value}-${parts.find((p) => p.type === 'month').value}`;
  }
  
  export function shiftMonth(key, delta) {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  
  export function monthLabel(key) {
    const [y, m] = key.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  }
  
  // Oldest first: [{ value: '2026-05', label: 'May 2026' }, ...]
  export function monthOptions(back = 6, ahead = 2) {
    const now = currentMonthKey();
    const list = [];
    for (let i = -back; i <= ahead; i += 1) {
      const value = shiftMonth(now, i);
      list.push({ value, label: monthLabel(value) });
    }
    return list;
  }
  
  // Suggested due date: the 10th of the billing month. The user can change it.
  export const defaultDueDate = (month) => `${month}-10`;
  // "2026-11-17": the calendar date in Pakistan for any moment in time
export const pkDateString = (value = new Date()) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  
  export const todayDateString = () => pkDateString();
  
  // True when the due date was before today (Pakistan time)
  export const isOverdue = (dueDate) => pkDateString(dueDate) < todayDateString();