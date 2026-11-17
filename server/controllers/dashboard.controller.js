import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Voucher from '../models/Voucher.js';
import Payment from '../models/Payment.js';
import { dashboardQuerySchema } from '../validators/report.validator.js';
import { overdueFilter } from '../services/defaulter.service.js';
import { refreshFines } from '../services/fine.service.js';
import { currentMonthKey, shiftMonth, monthLabel, dueDateToDate } from '../utils/dates.js';
import { pkDateString } from '../utils/fine.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

const TZ = 'Asia/Karachi';
const NATURAL = { locale: 'en', strength: 2, numericOrdering: true };
const balance = { $subtract: ['$total', '$paid'] };
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

export const getDashboard = asyncHandler(async (req, res) => {
  const { month: asked } = dashboardQuerySchema.parse(req.query);
  const month = asked ?? currentMonthKey();

  const firstMonth = shiftMonth(month, -5); // the chart shows 6 months ending at the chosen month
  const rangeStart = dueDateToDate(`${firstMonth}-01`);
  const rangeEnd = dueDateToDate(`${shiftMonth(month, 1)}-01`);
  const startOfToday = new Date(`${pkDateString(new Date())}T00:00:00+05:00`);

  await refreshFines(); // overdue vouchers always show today's fine

  const [students, classes, byStatus, outstanding, defaulters, byClass, received, recent, upcoming] = await Promise.all([
    Student.countDocuments({ status: 'active' }),
    Class.countDocuments(),
    Voucher.aggregate([
      { $match: { month } },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' }, paid: { $sum: '$paid' } } },
    ]),
    Voucher.aggregate([
      { $match: { status: { $in: ['unpaid', 'partial'] } } },
      { $group: { _id: null, vouchers: { $sum: 1 }, amount: { $sum: balance } } },
    ]),
    Voucher.aggregate([
      { $match: overdueFilter() },
      { $group: { _id: '$student', vouchers: { $sum: 1 }, amount: { $sum: balance } } },
      { $group: { _id: null, students: { $sum: 1 }, vouchers: { $sum: '$vouchers' }, amount: { $sum: '$amount' } } },
    ]),
    Voucher.aggregate([
      { $match: { month } },
      {
        $group: {
          _id: { className: '$className', section: '$section' },
          vouchers: { $sum: 1 },
          billed: { $sum: '$total' },
          collected: { $sum: '$paid' },
        },
      },
      { $sort: { '_id.className': 1, '_id.section': 1 } },
    ]).collation(NATURAL),
    Payment.aggregate([
      { $match: { date: { $gte: rangeStart, $lt: rangeEnd } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: TZ } },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    Payment.find()
      .select('receiptNo studentName rollNo className section method amount date voucherNo')
      .sort({ date: -1, createdAt: -1 })
      .limit(8)
      .lean(),
    Voucher.aggregate([
      { $match: { status: { $in: ['unpaid', 'partial'] }, dueDate: { $gte: startOfToday } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$dueDate', timezone: TZ } },
          vouchers: { $sum: 1 },
          amount: { $sum: balance },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 5 },
    ]),
  ]);

  const stat = (s) => byStatus.find((x) => x._id === s)?.count ?? 0;
  const billed = byStatus.reduce((sum, x) => sum + x.total, 0);
  const collected = byStatus.reduce((sum, x) => sum + x.paid, 0);
  const vouchers = byStatus.reduce((sum, x) => sum + x.count, 0);

  const receivedMap = new Map(received.map((r) => [r._id, r]));
  const monthlyReceived = Array.from({ length: 6 }, (_, i) => {
    const key = shiftMonth(firstMonth, i);
    return { month: key, amount: receivedMap.get(key)?.amount ?? 0 };
  });
  const thisMonth = receivedMap.get(month);

  sendSuccess(res, {
    data: {
      period: { month, label: monthLabel(month) },
      school: { students, classes },
      billing: {
        vouchers,
        billed,
        collected,
        pending: billed - collected,
        rate: pct(collected, billed),
        paid: stat('paid'),
        partial: stat('partial'),
        unpaid: stat('unpaid'),
      },
      received: { amount: thisMonth?.amount ?? 0, count: thisMonth?.count ?? 0 },
      outstanding: { amount: outstanding[0]?.amount ?? 0, vouchers: outstanding[0]?.vouchers ?? 0 },
      defaulters: {
        students: defaulters[0]?.students ?? 0,
        vouchers: defaulters[0]?.vouchers ?? 0,
        amount: defaulters[0]?.amount ?? 0,
      },
      byClass: byClass.map((c) => ({
        className: c._id.className,
        section: c._id.section,
        vouchers: c.vouchers,
        billed: c.billed,
        collected: c.collected,
      })),
      monthlyReceived,
      recentPayments: recent,
      upcoming: upcoming.map((u) => ({ date: u._id, vouchers: u.vouchers, amount: u.amount })),
    },
  });
});