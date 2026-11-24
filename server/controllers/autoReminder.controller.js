import SchoolSettings from '../models/SchoolSettings.js';
import { autoReminderSchema } from '../validators/settings.validator.js';
import { runAutoReminders } from '../services/autoReminder.service.js';
import { emailConfigured } from '../services/reminder.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

const policyOf = (s) => ({
  enabled: s.autoReminderEnabled ?? false,
  days: s.autoReminderDays?.length ? s.autoReminderDays : [3],
});

export const getAutoReminders = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: policyOf(await SchoolSettings.getDefault()) });
});

export const updateAutoReminders = asyncHandler(async (req, res) => {
  const body = autoReminderSchema.parse(req.body);
  await SchoolSettings.getDefault();
  const updated = await SchoolSettings.findOneAndUpdate(
    { key: 'default' },
    { $set: { autoReminderEnabled: body.enabled, autoReminderDays: body.days.length ? body.days : [3] } },
    { returnDocument: 'after', runValidators: true }
  ).lean();

  sendSuccess(res, {
    data: policyOf(updated),
    message: body.enabled ? 'Automatic reminders are on' : 'Automatic reminders are off',
  });
});

// "Send now": runs the same check as the schedule. Parents are never emailed twice for the same reminder.
export const runAutoRemindersNow = asyncHandler(async (req, res) => {
  const s = await SchoolSettings.getDefault();
  if (!s.autoReminderEnabled) throw ApiError.badRequest('Turn on automatic reminders and save first');
  if (!emailConfigured()) throw ApiError.badRequest('Email is not set up on the server yet');

  const r = await runAutoReminders();
  if (r.busy) throw ApiError.conflict('A reminder check is already running. Please try again in a minute.');

  const parts = [`${r.sent} emailed`];
  if (r.failed) parts.push(`${r.failed} failed`);
  if (r.noEmail) parts.push(`${r.noEmail} skipped (no email address)`);
  if (r.alreadySent) parts.push(`${r.alreadySent} already emailed earlier`);
  let message = r.checked === 0 ? 'No unpaid vouchers are due on the chosen days.' : `Checked ${r.checked} vouchers: ${parts.join(', ')}`;
  if (r.stopped) message += `. Stopped: ${r.stopped}`;
  if (r.capped) message += '. Limit reached, the rest will be sent by the next hourly run';

  sendSuccess(res, { data: r, message });
});