import mongoose from 'mongoose';
import Voucher from '../models/Voucher.js';
import Payment from '../models/Payment.js';
import Counter from '../models/Counter.js';
import { refreshFines } from './fine.service.js';
import { currentMonthKey, dueDateToDate } from '../utils/dates.js';
import { ApiError } from '../utils/ApiError.js';

const rs = (n) => `Rs ${Number(n).toLocaleString('en-PK')}`;
const receiptNumber = (month, seq) => `RC-${month.replace('-', '')}-${String(seq).padStart(5, '0')}`;

// Makes sure the counter exists BEFORE the transaction starts, so the transaction only ever increments it.
async function ensureCounter(id) {
  try {
    await Counter.updateOne({ _id: id }, { $setOnInsert: { seq: 0 } }, { upsert: true });
  } catch (err) {
    if (err.code !== 11000) throw err; // another request created it at the same moment: that is fine
  }
}

// Called only when the guarded update matched nothing. Works out why, in plain words.
async function explainFailure(voucherId, amount, session) {
  const v = await Voucher.findById(voucherId).session(session).select('total paid status').lean();
  if (!v) return ApiError.notFound('Voucher not found');

  const balance = v.total - v.paid;
  if (v.status === 'paid' || balance <= 0) return ApiError.conflict('This voucher is already fully paid');
  if (amount > balance) {
    return ApiError.badRequest(`The amount is more than the balance. The balance to pay is ${rs(balance)}.`, [
      { field: 'amount', message: `Cannot be more than ${rs(balance)}` },
    ]);
  }
  return ApiError.conflict('This voucher changed a moment ago. Please check the balance and try again.');
}

export async function createPayment({ voucherId, amount, method, date, note, user }) {
  await Payment.init(); // makes sure the collection and its unique index exist before the transaction
  const counterId = `receipt:${currentMonthKey()}`;
  await ensureCounter(counterId);

  // Bring the late fine up to date first, so the balance being paid is today's balance.
  await refreshFines({ _id: voucherId });

  const session = await mongoose.startSession();
  try {
    let payment;
    let voucher;

    await session.withTransaction(async () => {
      // One guarded update: it only matches if the voucher is still unpaid or partly paid
      // AND this amount does not take "paid" above "total". The database decides, not our code,
      // so two payments at the same moment can never overpay a voucher.
      const newPaid = { $add: ['$paid', amount] };
      const updated = await Voucher.findOneAndUpdate(
        {
          _id: voucherId,
          status: { $in: ['unpaid', 'partial'] },
          $expr: { $lte: [{ $add: ['$paid', amount] }, '$total'] },
        },
        [
          {
            $set: {
              paid: newPaid,
              status: { $cond: [{ $gte: [newPaid, '$total'] }, 'paid', 'partial'] },
            },
          },
        ],
        { session, returnDocument: 'after', updatePipeline: true }
      ).lean();

      if (!updated) throw await explainFailure(voucherId, amount, session);

      const counter = await Counter.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { session, returnDocument: 'after' }
      );

      const [created] = await Payment.create(
        [
          {
            receiptNo: receiptNumber(currentMonthKey(), counter.seq),
            voucher: updated._id,
            student: updated.student,
            amount,
            method,
            date: dueDateToDate(date), // the chosen day, at the start of that day in Pakistan
            note,
            receivedBy: user._id,
            receivedByName: user.name,
            voucherNo: updated.voucherNo,
            studentName: updated.studentName,
            rollNo: updated.rollNo,
            className: updated.className,
            section: updated.section,
            month: updated.month,
            voucherTotal: updated.total,
            paidAfter: updated.paid,
            balanceAfter: updated.total - updated.paid,
          },
        ],
        { session }
      );

      payment = created.toObject();
      voucher = updated;
    });

    return { payment, voucher };
  } finally {
    await session.endSession();
  }
}