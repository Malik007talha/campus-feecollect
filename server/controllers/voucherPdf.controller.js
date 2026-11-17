import Voucher from '../models/Voucher.js';
import SchoolSettings from '../models/SchoolSettings.js';
import { buildVouchersPdf } from '../services/voucherPdf.service.js';
import { refreshFines } from '../services/fine.service.js';
import { listVouchersQuerySchema } from '../validators/voucher.validator.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const MAX_PDF_VOUCHERS = 600;

function sendPdf(res, buffer, filename) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${filename}"`,
    'Content-Length': buffer.length,
  });
  res.end(buffer);
}

export const downloadVoucherPdf = asyncHandler(async (req, res) => {
  await refreshFines({ _id: req.params.id }); // the PDF always shows today's fine
  const voucher = await Voucher.findById(req.params.id).lean();
  if (!voucher) throw ApiError.notFound('Voucher not found');
  const settings = await SchoolSettings.getDefault();
  const buffer = await buildVouchersPdf([voucher], settings);
  sendPdf(res, buffer, `fee-voucher-${voucher.voucherNo}.pdf`);
});

// All vouchers that match the filters, one page each.
export const downloadBulkPdf = asyncHandler(async (req, res) => {
  const q = listVouchersQuerySchema.parse(req.query);
  if (!q.month) throw ApiError.badRequest('Choose a month first');

  const filter = { month: q.month };
  if (q.status) filter.status = q.status;
  if (q.className) filter.className = q.className;
  if (q.section) filter.section = q.section.toUpperCase();
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ voucherNo: rx }, { studentName: rx }, { rollNo: rx }, { parentName: rx }];
  }

  const count = await Voucher.countDocuments(filter);
  if (count === 0) throw ApiError.notFound('No vouchers match your selection');
  if (count > MAX_PDF_VOUCHERS) {
    throw ApiError.badRequest(
      `That is ${count} vouchers. Please download up to ${MAX_PDF_VOUCHERS} at a time by choosing a class or section.`
    );
  }

  await refreshFines(filter);

  const vouchers = await Voucher.find(filter)
    .sort({ className: 1, section: 1, rollNo: 1 })
    .collation({ locale: 'en', numericOrdering: true })
    .lean();
  const settings = await SchoolSettings.getDefault();
  const buffer = await buildVouchersPdf(vouchers, settings);
  sendPdf(res, buffer, `fee-vouchers-${q.month}.pdf`);
});