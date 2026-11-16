import ExcelJS from 'exceljs';
import Class from '../models/Class.js';
import Student, { DISCOUNT_TYPES } from '../models/Student.js';
import { normalizePkMobile } from '../utils/phone.js';
import { ApiError } from '../utils/ApiError.js';

export const MAX_IMPORT_ROWS = 1000;

export const IMPORT_FIELDS = [
  'name', 'rollNo', 'className', 'section', 'parentName',
  'parentPhone', 'parentEmail', 'discountType', 'discountPercent', 'familyId',
];
const REQUIRED_FIELDS = ['name', 'rollNo', 'className', 'section', 'parentName', 'parentPhone'];

const HEADER_LABELS = {
  name: 'Student Name',
  rollNo: 'Roll No',
  className: 'Class',
  section: 'Section',
  parentName: 'Parent Name',
  parentPhone: 'Parent Phone',
  parentEmail: 'Parent Email',
  discountType: 'Discount Type',
  discountPercent: 'Discount %',
  familyId: 'Family Code',
};

// Accepted spellings of each column heading (lower case, letters and digits only).
const HEADER_ALIASES = {
  name: ['studentname', 'name'],
  rollNo: ['rollno', 'rollnumber', 'roll'],
  className: ['class', 'classname'],
  section: ['section'],
  parentName: ['parentname', 'fathername', 'guardianname'],
  parentPhone: ['parentphone', 'parentmobile', 'parentmobilenumber', 'phone', 'mobile'],
  parentEmail: ['parentemail', 'email'],
  discountType: ['discounttype'],
  discountPercent: ['discount', 'discountpercent', 'discountpercentage'],
  familyId: ['familycode', 'familyid'],
};

const NATURAL_SORT = { locale: 'en', strength: 2, numericOrdering: true };
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const norm = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
const key = (v) => norm(v).toLowerCase();
const headerKey = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const classText = (c) => `${c.name} – Section ${c.section}`;

function cellText(cell) {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(cell.text ?? '').trim().slice(0, 200);
}

/* ------------------------------ Reading the file ------------------------------ */

export async function parseWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw ApiError.badRequest(
      'This file could not be read. Please upload an Excel (.xlsx) file, ideally the sample template.'
    );
  }

  const sheet = workbook.getWorksheet('Students') ?? workbook.worksheets[0];
  if (!sheet) throw ApiError.badRequest('The Excel file has no sheets.');

  const columnOf = {};
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    const heading = headerKey(cellText(cell));
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(heading) && !columnOf[field]) columnOf[field] = col;
    }
  });

  const missing = REQUIRED_FIELDS.filter((f) => !columnOf[f]);
  if (missing.length) {
    throw ApiError.badRequest(
      `The first row of your sheet is missing these columns: ${missing
        .map((f) => HEADER_LABELS[f])
        .join(', ')}. Please start from the sample template.`
    );
  }

  const rows = [];
  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const excelRow = sheet.getRow(r);
    const data = {};
    for (const field of IMPORT_FIELDS) {
      data[field] = columnOf[field] ? cellText(excelRow.getCell(columnOf[field])) : '';
    }
    if (IMPORT_FIELDS.every((f) => data[f] === '')) continue; // skip empty rows
    rows.push({ rowNumber: r, data });
    if (rows.length > MAX_IMPORT_ROWS) {
      throw ApiError.badRequest(
        `This file has more than ${MAX_IMPORT_ROWS} students. Please split it into smaller files.`
      );
    }
  }

  if (rows.length === 0) {
    throw ApiError.badRequest('No student rows were found. Type students under the headings in the first sheet.');
  }
  return rows;
}

/* -------------------------------- Checking rows -------------------------------- */

function checkRow(row, classByKey, classNames) {
  const d = row.data;
  const errors = [];
  const problem = (field, message) => errors.push({ field, message });
  const clean = {};

  clean.name = norm(d.name);
  if (!clean.name) problem('name', 'Student name is missing');
  else if (clean.name.length < 2) problem('name', 'Student name is too short');
  else if (clean.name.length > 80) problem('name', 'Student name is too long');

  clean.rollNo = norm(d.rollNo);
  if (!clean.rollNo) problem('rollNo', 'Roll number is missing');
  else if (clean.rollNo.length > 20) problem('rollNo', 'Roll number is too long');

  const className = norm(d.className);
  const section = norm(d.section);
  let cls = null;
  if (!className) {
    problem('className', 'Class is missing');
  } else if (!section) {
    problem('section', 'Section is missing');
  } else {
    cls = classByKey.get(`${key(className)}|${key(section)}`) ?? null;
    if (!cls) {
      if (classNames.has(key(className))) {
        problem('section', `Section ${section.toUpperCase()} does not exist in ${className}. Add it on the Classes page first.`);
      } else {
        problem('className', `Class "${className}" was not found. Check the spelling, or add it on the Classes page first.`);
      }
    }
  }

  clean.parentName = norm(d.parentName);
  if (!clean.parentName) problem('parentName', 'Parent name is missing');
  else if (clean.parentName.length < 2) problem('parentName', 'Parent name is too short');
  else if (clean.parentName.length > 80) problem('parentName', 'Parent name is too long');

  if (!norm(d.parentPhone)) {
    problem('parentPhone', 'Parent phone is missing');
  } else {
    const phone = normalizePkMobile(d.parentPhone);
    if (!phone) problem('parentPhone', 'Phone number is not valid (example: 0300-1234567)');
    else clean.parentPhone = phone;
  }

  const email = norm(d.parentEmail).toLowerCase();
  if (email) {
    if (EMAIL_RX.test(email)) clean.parentEmail = email;
    else problem('parentEmail', 'Email address is not valid');
  }

  const typeText = key(d.discountType);
  let discountType = 'none';
  let typeOk = true;
  if (typeText === '' || typeText === 'none') discountType = 'none';
  else if (DISCOUNT_TYPES.includes(typeText)) discountType = typeText;
  else {
    typeOk = false;
    problem('discountType', 'Discount type must be none, sibling or scholarship');
  }

  const percentText = norm(d.discountPercent).replace('%', '').trim();
  let discountPercent = 0;
  let percentOk = true;
  if (percentText !== '') {
    const n = Number(percentText);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      percentOk = false;
      problem('discountPercent', 'Discount must be a number from 0 to 100');
    } else {
      discountPercent = n;
    }
  }

  if (typeOk && percentOk) {
    if (discountType !== 'none' && discountPercent === 0) {
      problem('discountPercent', 'Enter a discount between 1 and 100');
    } else if (discountType === 'none' && discountPercent > 0) {
      problem('discountType', 'Choose sibling or scholarship for this discount');
    }
  }
  clean.discountType = discountType;
  clean.discountPercent = discountPercent;

  const familyId = norm(d.familyId).toUpperCase();
  if (familyId.length > 30) problem('familyId', 'Family code is too long');
  else if (familyId) clean.familyId = familyId;

  return { rowNumber: row.rowNumber, data: d, errors, clean, cls, duplicate: false };
}

export async function validateRows(rows) {
  const classes = await Class.find().select('name section').lean();
  const classByKey = new Map(classes.map((c) => [`${key(c.name)}|${key(c.section)}`, c]));
  const classNames = new Set(classes.map((c) => key(c.name)));

  const checked = rows.map((row) => checkRow(row, classByKey, classNames));

  // Duplicate roll numbers inside the file
  const firstSeen = new Map();
  for (const r of checked) {
    if (!r.cls || !r.clean.rollNo) continue;
    const k = `${r.cls._id}|${r.clean.rollNo}`;
    if (firstSeen.has(k)) {
      r.duplicate = true;
      r.errors.push({
        field: 'rollNo',
        message: `Roll number ${r.clean.rollNo} is repeated in this file (first used in row ${firstSeen.get(k)})`,
      });
    } else {
      firstSeen.set(k, r.rowNumber);
    }
  }

  // Duplicate roll numbers already in the database
  const candidates = checked.filter((r) => r.cls && r.clean.rollNo && !r.duplicate);
  if (candidates.length) {
    const existing = await Student.find({
      class: { $in: [...new Set(candidates.map((r) => String(r.cls._id)))] },
      rollNo: { $in: [...new Set(candidates.map((r) => r.clean.rollNo))] },
    })
      .select('class rollNo name')
      .lean();
    const existingMap = new Map(existing.map((s) => [`${s.class}|${s.rollNo}`, s.name]));

    for (const r of candidates) {
      const owner = existingMap.get(`${r.cls._id}|${r.clean.rollNo}`);
      if (owner) {
        r.duplicate = true;
        r.errors.push({
          field: 'rollNo',
          message: `Roll number ${r.clean.rollNo} is already used by ${owner} in ${classText(r.cls)}`,
        });
      }
    }
  }

  return checked;
}

export function toPreview(checked) {
  const rows = checked.map((r) => ({
    rowNumber: r.rowNumber,
    data: r.data,
    errors: r.errors,
    duplicate: r.duplicate,
    valid: r.errors.length === 0,
  }));
  const valid = rows.filter((r) => r.valid).length;
  return {
    rows,
    summary: {
      total: rows.length,
      valid,
      invalid: rows.length - valid,
      duplicates: rows.filter((r) => r.duplicate).length,
    },
  };
}

/* --------------------------------- Importing --------------------------------- */

export async function importRows(rows) {
  const checked = await validateRows(rows); // always re-check on the server
  const good = checked.filter((r) => r.errors.length === 0);

  if (good.length === 0) {
    throw ApiError.badRequest('None of the rows are ready to import. Please fix the problems first.');
  }

  const skipped = checked
    .filter((r) => r.errors.length > 0)
    .map((r) => ({ rowNumber: r.rowNumber, name: r.data.name, reasons: r.errors.map((e) => e.message) }));

  const docs = good.map((r) => ({ ...r.clean, class: r.cls._id }));
  let imported = docs.length;

  try {
    await Student.insertMany(docs, { ordered: false });
  } catch (err) {
    // Only reached if another user added the same roll number at the same moment.
    const writeErrors = err.writeErrors ?? [];
    if (writeErrors.length === 0) throw err;
    imported = docs.length - writeErrors.length;
    for (const we of writeErrors) {
      const row = good[we.index ?? we.err?.index];
      if (row) {
        skipped.push({
          rowNumber: row.rowNumber,
          name: row.data.name,
          reasons: ['This roll number was added by someone else a moment ago'],
        });
      }
    }
  }

  skipped.sort((a, b) => a.rowNumber - b.rowNumber);
  return { imported, skipped };
}

/* --------------------------------- Template --------------------------------- */

export async function buildTemplate() {
  const classes = await Class.find()
    .select('name section')
    .sort({ name: 1, section: 1 })
    .collation(NATURAL_SORT)
    .lean();

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Campus FeeCollect';

  // 1. The sheet that gets imported
  const sheet = wb.addWorksheet('Students');
  const widths = [24, 10, 14, 10, 24, 16, 28, 16, 12, 14];
  sheet.columns = IMPORT_FIELDS.map((f, i) => ({ header: HEADER_LABELS[f], key: f, width: widths[i] }));
  const header = sheet.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14284B' } };
    cell.alignment = { vertical: 'middle' };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  // Keep roll numbers and phone numbers as text so leading zeros are not lost.
  ['rollNo', 'parentPhone'].forEach((f) => {
    sheet.getColumn(f).numFmt = '@';
  });
  for (let r = 2; r <= MAX_IMPORT_ROWS + 1; r += 1) {
    sheet.getCell(`H${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"none,sibling,scholarship"'],
    };
    sheet.getCell(`I${r}`).dataValidation = {
      type: 'decimal',
      operator: 'between',
      allowBlank: true,
      formulae: [0, 100],
      showErrorMessage: true,
      errorTitle: 'Discount %',
      error: 'Enter a number from 0 to 100',
    };
  }

  // 2. Instructions
  const help = wb.addWorksheet('How to fill');
  help.getColumn(1).width = 100;
  [
    'How to fill the Students sheet',
    '',
    '1. Type one student per row under the headings in the "Students" sheet. Do not change the headings.',
    '2. Class and Section must match a class you already added in Campus FeeCollect. See the "Your classes" sheet.',
    '3. Roll No must be different for every student in the same class and section.',
    '4. Parent Phone is a mobile number, for example 0300-1234567.',
    '5. Parent Email, Discount Type, Discount % and Family Code are optional.',
    '6. Discount Type: none, sibling or scholarship. If you choose sibling or scholarship, also fill Discount %.',
    '7. Save the file as .xlsx and upload it in Campus FeeCollect. You can fix any problems before importing.',
    '',
    'The "Example" sheet shows how a filled sheet looks. Only the "Students" sheet is imported.',
  ].forEach((line, i) => {
    const cell = help.getCell(`A${i + 1}`);
    cell.value = line;
    if (i === 0) cell.font = { bold: true, size: 14 };
    cell.alignment = { wrapText: true, vertical: 'top' };
  });

  // 3. Example
  const example = wb.addWorksheet('Example');
  example.columns = IMPORT_FIELDS.map((f, i) => ({ header: HEADER_LABELS[f], width: widths[i] }));
  example.getRow(1).font = { bold: true };
  [
    ['Ali Raza', '1', 'Class 5', 'A', 'Muhammad Raza', '0300-1234567', 'raza@example.com', 'none', '0', ''],
    ['Fatima Noor', '2', 'Class 5', 'A', 'Noor Ahmed', '0321-7654321', '', 'sibling', '10', 'NOOR-01'],
    ['Hamza Sheikh', '1', 'Class 6', 'B', 'Sheikh Imran', '0333-1112223', '', 'scholarship', '25', ''],
  ].forEach((r) => example.addRow(r));

  // 4. The school's own classes
  const list = wb.addWorksheet('Your classes');
  list.columns = [
    { header: 'Class', width: 22 },
    { header: 'Section', width: 12 },
  ];
  list.getRow(1).font = { bold: true };
  if (classes.length === 0) list.addRow(['No classes yet. Add classes in Campus FeeCollect first.', '']);
  classes.forEach((c) => list.addRow([c.name, c.section]));

  return wb.xlsx.writeBuffer();
}