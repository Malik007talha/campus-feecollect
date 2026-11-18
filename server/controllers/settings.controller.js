import SchoolSettings from '../models/SchoolSettings.js';
import { settingsSchema, finePolicySchema } from '../validators/settings.validator.js';
import { refreshFines } from '../services/fine.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

const finePolicyOf = (s) => ({
  fineType: s.fineType ?? 'none',
  fineAmount: s.fineAmount ?? 0,
  finePercent: s.finePercent ?? 0,
  fineGraceDays: s.fineGraceDays ?? 0,
  fineCap: s.fineCap ?? 0,
});

export const getSettings = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await SchoolSettings.getDefault() });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const body = settingsSchema.parse(req.body);
  await SchoolSettings.getDefault(); // makes sure the document exists
  const updated = await SchoolSettings.findOneAndUpdate(
    { key: 'default' },
    { $set: body },
    { returnDocument: 'after', runValidators: true }
  ).lean();
  sendSuccess(res, { data: updated, message: 'Settings saved' });
});

export const getFinePolicy = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: finePolicyOf(await SchoolSettings.getDefault()) });
});

export const updateFinePolicy = asyncHandler(async (req, res) => {
  const body = finePolicySchema.parse(req.body);
  await SchoolSettings.getDefault();
  const updated = await SchoolSettings.findOneAndUpdate(
    { key: 'default' },
    { $set: body },
    { returnDocument: 'after', runValidators: true }
  ).lean();

  // Apply the policy right away to vouchers that are already past their due date.
  const changed = await refreshFines();
  const message =
    body.fineType === 'none'
      ? 'Late fines are turned off'
      : `Late fine policy saved. ${changed} overdue ${changed === 1 ? 'voucher was' : 'vouchers were'} updated`;

  sendSuccess(res, { data: finePolicyOf(updated), message });
});