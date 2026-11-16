import {
    parseWorkbook,
    validateRows,
    toPreview,
    importRows,
    buildTemplate,
  } from '../services/studentImport.service.js';
  import { importRowsSchema } from '../validators/studentImport.validator.js';
  import { ApiError } from '../utils/ApiError.js';
  import { asyncHandler } from '../utils/asyncHandler.js';
  import { sendSuccess } from '../utils/apiResponse.js';
  
  const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  
  export const downloadTemplate = asyncHandler(async (req, res) => {
    const buffer = await buildTemplate();
    res.set({
      'Content-Type': XLSX_TYPE,
      'Content-Disposition': 'attachment; filename="student-import-template.xlsx"',
    });
    res.send(Buffer.from(buffer));
  });
  
  // Step 1: read the uploaded file and check every row. Nothing is saved.
  export const parseUpload = asyncHandler(async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw ApiError.badRequest('Please choose an Excel (.xlsx) file to upload');
    }
    const rows = await parseWorkbook(req.body);
    const checked = await validateRows(rows);
    sendSuccess(res, { data: toPreview(checked), message: 'File checked' });
  });
  
  // Step 2: re-check rows after the user corrected some. Nothing is saved.
  export const validateImport = asyncHandler(async (req, res) => {
    const { rows } = importRowsSchema.parse(req.body);
    const checked = await validateRows(rows);
    sendSuccess(res, { data: toPreview(checked), message: 'Rows checked' });
  });
  
  // Step 3: save the valid rows. Invalid rows are skipped and reported.
  export const commitImport = asyncHandler(async (req, res) => {
    const { rows } = importRowsSchema.parse(req.body);
    const result = await importRows(rows);
    sendSuccess(res, {
      data: result,
      message: `${result.imported} ${result.imported === 1 ? 'student was' : 'students were'} imported`,
      statusCode: 201,
    });
  });