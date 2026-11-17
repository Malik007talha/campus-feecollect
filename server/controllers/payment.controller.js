import Voucher from '../models/Voucher.js';
import Payment from '../models/Payment.js';
import SchoolSettings from '../models/SchoolSettings.js';
import {
  recordPaymentSchema,
  listPaymentsQuerySchema,
  searchQuerySchema,
} from '../validators/payment.validator.js';
import { createPayment } from '../services/payment.service.js';
import { buildReceiptPdf } from '../services/receiptPdf.service.js';
import { refreshFines } from '../services/fine.service.js';
import { dueDateToDate } from '../utils/dates.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { getPagination, buildPagination } from '../utils/pagination.js';

const rs = (n) => `Rs ${Number(n).toLocaleString('en-PK')}`;
const OUTSTANDING = ['unpaid', 'partial'];
const SEARCH_LIMIT = 25;

/* ------------------------- Find vouchers that still owe money ------------------------- */

export const searchOutstanding = asyncHandler(async (req, res) => {
  const { q } = searchQuerySchema.parse(req.query);

  const filter = { status: { $in: OUTSTANDING } };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const or = [{ voucherNo: rx }, { studentName: rx }, { rollNo: rx }, { parentName: rx }];
    const digits = q.replace(/\D/g, '');
    if (digits.length >= 3) or.push({ parentPhone: new RegExp(escapeRegex(digits)) });
    filter.$or = or;
  }

  const sort = { dueDate: 1, voucherNo: 1 };
  const [first, total] = await Promise.all([
    Voucher.find(filter).select('_id').sort(sort).limit(SEARCH_LIMIT).lean(),
    Voucher.countDocuments(filter),
  ]);

  // Late fines are brought up to date for the vouchers being shown, so balances are correct.
  const ids = first.map((v) => v._id);
  await refreshFines({ _id: { $in: ids } });
  const items = await Voucher.find({ _id: { $in: ids } }).select('-__v').sort(sort).lean();

  sendSuccess(res, { data: { items, total } });
});

/* ------------------------------------ Record ------------------------------------ */

export const recordPayment = asyncHandler(async (req, res) => {
  const input = recordPaymentSchema.parse(req.body);
  const { payment, voucher } = await createPayment({ ...input, user: req.user });

  const balance = voucher.total - voucher.paid;
  sendSuccess(res, {
    data: { payment, voucher },
    message:
      balance === 0
        ? `Payment recorded. ${voucher.studentName}'s voucher is now fully paid`
        : `Payment recorded. Remaining balance: ${rs(balance)}`,
    statusCode: 201,
  });
});

/* ------------------------------------- Read ------------------------------------- */

export const listPayments = asyncHandler(async (req, res) => {
  const q = listPaymentsQuerySchema.parse(req.query);
  const { page, limit, skip } = getPagination(req.query);

  const filter = {};
  if (q.method) filter.method = q.method;
  if (q.from || q.to) {
    filter.date = {};
    if (q.from) filter.date.$gte = dueDateToDate(q.from);
    if (q.to) filter.date.$lt = new Date(dueDateToDate(q.to).getTime() + 86400000); // up to the end of that day
  }
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ receiptNo: rx }, { voucherNo: rx }, { studentName: rx }, { rollNo: rx }];
  }

  const [items, count, groups] = await Promise.all([
    Payment.find(filter).select('-__v').sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
    Payment.aggregate([
      { $match: filter },
      { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const byMethod = {};
  let total = 0;
  for (const g of groups) {
    byMethod[g._id] = g.total;
    total += g.total;
  }

  sendSuccess(res, {
    data: { items, summary: { count, total, byMethod } },
    pagination: buildPagination(count, page, limit),
  });
});

export const voucherHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ voucher: req.params.voucherId })
    .select('-__v')
    .sort({ date: 1, createdAt: 1 })
    .lean();
  sendSuccess(res, { data: payments });
});

export const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).select('-__v').lean();
  if (!payment) throw ApiError.notFound('Payment not found');
  sendSuccess(res, { data: payment });
});

export const downloadReceipt = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).lean();
  if (!payment) throw ApiError.notFound('Payment not found');
  const settings = await SchoolSettings.getDefault();
  const buffer = await buildReceiptPdf(payment, settings);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="receipt-${payment.receiptNo}.pdf"`,
    'Content-Length': buffer.length,
  });
  res.end(buffer);
});