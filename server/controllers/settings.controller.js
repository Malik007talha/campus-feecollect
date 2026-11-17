import SchoolSettings from '../models/SchoolSettings.js';
import { settingsSchema } from '../validators/settings.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

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