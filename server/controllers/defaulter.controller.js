import Voucher from '../models/Voucher.js';
import Student from '../models/Student.js';
import { defaulterQuerySchema } from '../validators/reminder.validator.js';
import { overdueFilter, balanceFilter } from '../services/defaulter.service.js';
import { refreshFines } from '../services/fine.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, buildPagination } from '../utils/pagination.js';

const NATURAL_SORT = { locale: 'en', strength: 2, numericOrdering: true };

const SORTS = {
  due_asc: { dueDate: 1, voucherNo: 1 },
  due_desc: { dueDate: -1, voucherNo: 1 },
  balance_desc: { balance: -1, voucherNo: 1 },
  balance_asc: { balance: 1, voucherNo: 1 },
  name: { studentName: 1, voucherNo: 1 },
};

export const listDefaulters = asyncHandler(async (req, res) => {
  const q = defaulterQuerySchema.parse(req.query);
  const { page, limit, skip } = getPagination(req.query);

  const base = overdueFilter(q);
  await refreshFines(base); // fines are always up to date on this page
  const match = { ...base, ...balanceFilter(q.minBalance) };

  const [result] = await Voucher.aggregate([
    { $match: match },
    { $addFields: { balance: { $subtract: ['$total', '$paid'] } } },
    {
      $facet: {
        items: [
          { $sort: SORTS[q.sort] ?? SORTS.due_asc },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: Student.collection.name,
              localField: 'student',
              foreignField: '_id',
              as: 'studentDoc',
            },
          },
          { $addFields: { parentEmail: { $arrayElemAt: ['$studentDoc.parentEmail', 0] } } },
          { $project: { studentDoc: 0, __v: 0 } },
        ],
        summary: [
          { $group: { _id: null, count: { $sum: 1 }, outstanding: { $sum: '$balance' }, fines: { $sum: '$fine' } } },
        ],
        byClass: [
          {
            $group: {
              _id: { className: '$className', section: '$section' },
              count: { $sum: 1 },
              outstanding: { $sum: '$balance' },
            },
          },
          { $sort: { '_id.className': 1, '_id.section': 1 } },
        ],
      },
    },
  ]).collation(NATURAL_SORT);

  const summary = result.summary[0] ?? { count: 0, outstanding: 0, fines: 0 };

  sendSuccess(res, {
    data: {
      items: result.items,
      summary: { count: summary.count, outstanding: summary.outstanding, fines: summary.fines },
      byClass: result.byClass.map((c) => ({
        className: c._id.className,
        section: c._id.section,
        count: c.count,
        outstanding: c.outstanding,
      })),
    },
    pagination: buildPagination(summary.count, page, limit),
  });
});