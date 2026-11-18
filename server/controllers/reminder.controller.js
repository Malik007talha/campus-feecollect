import ReminderLog from '../models/ReminderLog.js';
import { sendReminderSchema, listRemindersQuerySchema } from '../validators/reminder.validator.js';
import { findDefaulterIds, MAX_REMINDERS } from '../services/defaulter.service.js';
import { sendReminders, emailConfigured } from '../services/reminder.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, buildPagination } from '../utils/pagination.js';

// Tells the screen whether email is set up on the server.
export const reminderStatus = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: { email: emailConfigured() } });
});

export const sendReminder = asyncHandler(async (req, res) => {
  const input = sendReminderSchema.parse(req.body);

  if (!emailConfigured()) {
    throw ApiError.badRequest('Email is not set up yet. The administrator must add the email settings (SMTP) to the server.');
  }

  let ids = input.voucherIds;
  if (!ids) {
    ids = await findDefaulterIds(input.filters);
    if (ids.length === 0) throw ApiError.notFound('No students with unpaid fees match your filters');
    if (ids.length > MAX_REMINDERS) {
      throw ApiError.badRequest(
        `More than ${MAX_REMINDERS} students match. Please narrow the list by choosing a class or section, then send again.`
      );
    }
  }

  const { summary, results } = await sendReminders({ voucherIds: ids, force: input.force, user: req.user });

  const parts = [];
  if (summary.sent) parts.push(`${summary.sent} emailed`);
  if (summary.failed) parts.push(`${summary.failed} failed`);
  if (summary.skipped) parts.push(`${summary.skipped} skipped`);

  sendSuccess(res, {
    data: { summary, results },
    message: parts.length ? `Reminders: ${parts.join(', ')}` : 'No reminders were sent',
  });
});

export const listReminders = asyncHandler(async (req, res) => {
  const q = listRemindersQuerySchema.parse(req.query);
  const { page, limit, skip } = getPagination(req.query);

  const filter = {};
  if (q.voucherId) filter.voucher = q.voucherId;
  if (q.status) filter.status = q.status;
  if (q.channel) filter.channel = q.channel;

  const [items, total] = await Promise.all([
    ReminderLog.find(filter).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ReminderLog.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, pagination: buildPagination(total, page, limit) });
});