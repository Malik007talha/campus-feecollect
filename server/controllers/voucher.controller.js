import Voucher from '../models/Voucher.js';
import { generateSchema, listVouchersQuerySchema } from '../validators/voucher.validator.js';
import { buildPlan, summarizePlan, generateVouchers as runGeneration } from '../services/voucher.service.js';
import { monthLabel } from '../utils/dates.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { getPagination, buildPagination } from '../utils/pagination.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function describeScope(input, plan) {
  if (input.scope === 'school') return 'Entire school';
  const name = plan.classes[0].name;
  return input.section ? `${name} – Section ${input.section.toUpperCase()}` : `${name} – all sections`;
}

// Shows what WOULD happen. Nothing is saved.
export const previewVouchers = asyncHandler(async (req, res) => {
  const input = generateSchema.parse(req.body);
  const plan = await buildPlan(input);

  sendSuccess(res, {
    data: {
      scopeLabel: describeScope(input, plan),
      month: input.month,
      monthLabel: monthLabel(input.month),
      dueDate: input.dueDate,
      totalActive: plan.totalActive,
      alreadyExist: plan.alreadyExist,
      withoutFees: plan.withoutFees,
      classesWithoutFees: plan.classesWithoutFees,
      ...summarizePlan(plan),
    },
  });
});

export const generateVouchers = asyncHandler(async (req, res) => {
  const input = generateSchema.parse(req.body);
  const result = await runGeneration({ ...input, userId: req.user._id });
  const label = monthLabel(input.month);

  let message;
  if (result.created > 0) {
    message = `${plural(result.created, 'voucher was', 'vouchers were')} created for ${label}`;
    if (result.alreadyExisted > 0) message += `. ${result.alreadyExisted} already existed`;
  } else if (result.alreadyExisted > 0) {
    message = `No new vouchers were created. All ${result.alreadyExisted} vouchers for ${label} already exist.`;
  } else if (result.withoutFees > 0) {
    message = 'No vouchers were created because the classes have no fees set.';
  } else {
    message = 'There are no active students to make vouchers for.';
  }

  sendSuccess(res, {
    data: { ...result, month: input.month, monthLabel: label },
    message,
    statusCode: result.created > 0 ? 201 : 200,
  });
});

export const listVouchers = asyncHandler(async (req, res) => {
  const q = listVouchersQuerySchema.parse(req.query);
  const { page, limit, skip } = getPagination(req.query);

  const filter = {};
  if (q.month) filter.month = q.month;
  if (q.status) filter.status = q.status;
  if (q.className) filter.className = q.className;
  if (q.section) filter.section = q.section.toUpperCase();
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ voucherNo: rx }, { studentName: rx }, { rollNo: rx }, { parentName: rx }];
  }

  const [items, total, sums] = await Promise.all([
    Voucher.find(filter).select('-__v').sort({ voucherNo: 1 }).skip(skip).limit(limit).lean(),
    Voucher.countDocuments(filter),
    Voucher.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$paid' } } },
    ]),
  ]);

  const totalAmount = sums[0]?.total ?? 0;
  const paidAmount = sums[0]?.paid ?? 0;

  sendSuccess(res, {
    data: {
      items,
      summary: { count: total, total: totalAmount, paid: paidAmount, pending: totalAmount - paidAmount },
    },
    pagination: buildPagination(total, page, limit),
  });
});

export const getVoucher = asyncHandler(async (req, res) => {
  const voucher = await Voucher.findById(req.params.id).select('-__v').populate('generatedBy', 'name');
  if (!voucher) throw ApiError.notFound('Voucher not found');
  sendSuccess(res, { data: voucher });
});