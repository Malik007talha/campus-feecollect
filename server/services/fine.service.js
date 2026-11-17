import Voucher from '../models/Voucher.js';
import SchoolSettings from '../models/SchoolSettings.js';
import { calculateFine, pkDateString } from '../utils/fine.js';

const BATCH = 500;

export async function loadPolicy() {
  const s = await SchoolSettings.getDefault();
  return {
    type: s.fineType ?? 'none',
    amount: s.fineAmount ?? 0,
    percent: s.finePercent ?? 0,
    graceDays: s.fineGraceDays ?? 0,
    cap: s.fineCap ?? 0,
  };
}

// Brings the fine up to date on every unpaid or partly paid voucher that matches `extraFilter`
// and is past its due date. Returns how many vouchers changed.
// The fine is SET from the policy (never added to), so repeating this changes nothing.
export async function refreshFines(extraFilter = {}, now = new Date()) {
  const policy = await loadPolicy();
  if (policy.type === 'none') return 0;

  const startOfToday = new Date(`${pkDateString(now)}T00:00:00+05:00`);
  const filter = {
    $and: [extraFilter, { status: { $in: ['unpaid', 'partial'] } }, { dueDate: { $lt: startOfToday } }],
  };

  let changed = 0;
  let ops = [];

  const flush = async () => {
    if (ops.length === 0) return;
    const res = await Voucher.bulkWrite(ops, { ordered: false });
    changed += res.modifiedCount;
    ops = [];
  };

  const cursor = Voucher.find(filter).select('items discount fine paid status dueDate').lean().cursor();
  for await (const v of cursor) {
    const newFine = Math.max(v.fine ?? 0, calculateFine(v, policy, now)); // a fine never goes down
    if (newFine === (v.fine ?? 0)) continue;

    const subtotal = v.items.reduce((sum, i) => sum + i.amount, 0);
    ops.push({
      updateOne: {
        // Only applies if nobody paid or changed the voucher since it was read.
        filter: { _id: v._id, fine: v.fine ?? 0, paid: v.paid, status: v.status },
        update: { $set: { fine: newFine, total: subtotal - v.discount + newFine, fineAppliedAt: now } },
      },
    });
    if (ops.length >= BATCH) await flush();
  }
  await flush();
  return changed;
}