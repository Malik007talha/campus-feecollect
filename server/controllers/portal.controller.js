import mongoose from 'mongoose';
import Student from '../models/Student.js';
import Voucher from '../models/Voucher.js';
import Payment from '../models/Payment.js';
import SchoolSettings from '../models/SchoolSettings.js';
import { buildVouchersPdf } from '../services/voucherPdf.service.js';
import { buildReceiptPdf } from '../services/receiptPdf.service.js';
import { refreshFines } from '../services/fine.service.js';
import { pkDateString } from '../utils/fine.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

const studentIdOf = (req) => {
  if (!req.user.student) throw ApiError.forbidden('This login is not linked to a student');
  return req.user.student;
};

const checkId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Not found');
};

function sendPdf(res, buffer, filename) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${filename}"`,
    'Content-Length': buffer.length,
  });
  res.end(buffer);
}

export const me = asyncHandler(async (req, res) => {
  const student = await Student.findById(studentIdOf(req))
    .select('name rollNo class parentName status')
    .populate('class', 'name section')
    .lean();
  if (!student) throw ApiError.notFound('Your student record was not found. Please contact the school office.');

  sendSuccess(res, {
    data: {
      name: student.name,
      rollNo: student.rollNo,
      className: student.class?.name ?? '',
      section: student.class?.section ?? '',
      parentName: student.parentName,
      status: student.status,
      username: req.user.username,
    },
  });
});

export const listMyVouchers = asyncHandler(async (req, res) => {
  const sid = studentIdOf(req);
  await refreshFines({ student: sid }); // the late fine shown is always today's

  const items = await Voucher.find({ student: sid })
    .select('voucherNo month items discount fine total paid dueDate status')
    .sort({ month: -1 })
    .limit(60)
    .lean();

  const startOfToday = new Date(`${pkDateString(new Date())}T00:00:00+05:00`);
  let pending = 0;
  let unpaidCount = 0;
  let overdueCount = 0;
  let paidCount = 0;
  for (const v of items) {
    if (v.status === 'paid') {
      paidCount += 1;
      continue;
    }
    unpaidCount += 1;
    pending += v.total - v.paid;
    if (v.dueDate < startOfToday) overdueCount += 1;
  }

  sendSuccess(res, { data: { items, summary: { pending, unpaidCount, overdueCount, paidCount } } });
});

export const getMyVoucher = asyncHandler(async (req, res) => {
  const sid = studentIdOf(req);
  checkId(req.params.id);
  await refreshFines({ _id: req.params.id, student: sid });

  const voucher = await Voucher.findOne({ _id: req.params.id, student: sid })
    .select('voucherNo month items discount fine total paid dueDate status studentName rollNo className section')
    .lean();
  if (!voucher) throw ApiError.notFound('Voucher not found');

  const payments = await Payment.find({ voucher: voucher._id, student: sid })
    .select('receiptNo amount method date receivedByName')
    .sort({ date: 1, createdAt: 1 })
    .lean();

  sendSuccess(res, { data: { voucher, payments } });
});

export const myVoucherPdf = asyncHandler(async (req, res) => {
  const sid = studentIdOf(req);
  checkId(req.params.id);
  await refreshFines({ _id: req.params.id, student: sid });

  const voucher = await Voucher.findOne({ _id: req.params.id, student: sid }).lean();
  if (!voucher) throw ApiError.notFound('Voucher not found');
  const settings = await SchoolSettings.getDefault();
  sendPdf(res, await buildVouchersPdf([voucher], settings), `fee-voucher-${voucher.voucherNo}.pdf`);
});

export const myReceipt = asyncHandler(async (req, res) => {
  const sid = studentIdOf(req);
  checkId(req.params.id);
  const payment = await Payment.findOne({ _id: req.params.id, student: sid }).lean();
  if (!payment) throw ApiError.notFound('Receipt not found');
  const settings = await SchoolSettings.getDefault();
  sendPdf(res, await buildReceiptPdf(payment, settings), `receipt-${payment.receiptNo}.pdf`);
});