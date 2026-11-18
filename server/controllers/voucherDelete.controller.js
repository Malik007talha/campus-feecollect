import mongoose from 'mongoose';
import { z } from 'zod';
import Voucher from '../models/Voucher.js';
import AuditLog from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

const deleteSchema = z.object({
  reason: z.string().trim().min(3, 'Please write a short reason').max(200, 'Please keep the reason under 200 characters'),
});

export const deleteVoucher = asyncHandler(async (req, res) => {
  const { reason } = deleteSchema.parse(req.body ?? {});
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Voucher not found');

  // One atomic step: it only deletes a voucher that is still unpaid with nothing paid.
  // If a payment is recorded at the same moment, this matches nothing and nothing is lost.
  const deleted = await Voucher.findOneAndDelete({ _id: id, paid: 0, status: 'unpaid' });

  if (!deleted) {
    const exists = await Voucher.exists({ _id: id });
    if (!exists) throw ApiError.notFound('Voucher not found');
    throw ApiError.conflict(
      'This voucher has a payment recorded, so it cannot be deleted. Payment records are never removed.'
    );
  }

  try {
    await AuditLog.create({
      action: 'voucher.delete',
      reason,
      details: {
        voucherNo: deleted.voucherNo,
        studentName: deleted.studentName,
        rollNo: deleted.rollNo,
        class: `${deleted.className} - ${deleted.section}`,
        month: deleted.month,
        total: deleted.total,
        fine: deleted.fine,
      },
      by: req.user._id,
      byName: req.user.name,
    });
  } catch (err) {
    console.error('Audit record for deleted voucher failed:', err.message, deleted.voucherNo);
  }

  sendSuccess(res, {
    message: `Voucher ${deleted.voucherNo} for ${deleted.studentName} was deleted`,
    data: { voucherNo: deleted.voucherNo },
  });
});