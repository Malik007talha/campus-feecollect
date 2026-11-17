import SchoolSettings from '../models/SchoolSettings.js';
import { REPORT_TYPES, reportQuerySchema } from '../validators/report.validator.js';
import { buildReport } from '../services/report.service.js';
import { refreshFines } from '../services/fine.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getReport = asyncHandler(async (req, res) => {
  const { type } = req.params;
  if (!REPORT_TYPES.includes(type)) throw ApiError.notFound('Report not found');
  const query = reportQuerySchema.parse(req.query);

  // Late fines are brought up to date so voucher reports match the Unpaid Fees page.
  if (type !== 'collection' && type !== 'history') await refreshFines();

  const report = await buildReport(type, query);
  const school = await SchoolSettings.getDefault();

  sendSuccess(res, {
    data: {
      type,
      ...report,
      generatedAt: new Date(),
      school: { schoolName: school.schoolName, address: school.address, phone: school.phone },
    },
  });
});