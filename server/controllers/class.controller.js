import Class from '../models/Class.js';
import Student from '../models/Student.js';
import {
  createClassSchema,
  updateClassSchema,
  listClassesQuerySchema,
} from '../validators/class.validator.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { getPagination, buildPagination } from '../utils/pagination.js';

const CASE_INSENSITIVE = { locale: 'en', strength: 2 };
const NATURAL_SORT = { locale: 'en', strength: 2, numericOrdering: true }; // "Class 2" before "Class 10"

const label = (c) => `${c.name} – Section ${c.section}`;

// If "Class 5" already exists, typing "class 5" reuses the existing spelling.
async function canonicalName(name) {
  const existing = await Class.findOne({ name }).collation(CASE_INSENSITIVE).select('name');
  return existing ? existing.name : name;
}

export const listClasses = asyncHandler(async (req, res) => {
  const { search, name } = listClassesQuerySchema.parse(req.query);
  const { page, limit, skip } = getPagination(req.query);

  const match = {};
  if (name) match.name = name;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    match.$or = [{ name: rx }, { section: rx }];
  }

  const [result] = await Class.aggregate([
    { $match: match },
    { $sort: { name: 1, section: 1 } },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: Student.collection.name,
              let: { classId: '$_id' },
              pipeline: [{ $match: { $expr: { $eq: ['$class', '$$classId'] } } }, { $count: 'n' }],
              as: 'counts',
            },
          },
          { $addFields: { studentCount: { $ifNull: [{ $arrayElemAt: ['$counts.n', 0] }, 0] } } },
          { $project: { counts: 0, __v: 0 } },
        ],
        total: [{ $count: 'n' }],
      },
    },
  ]).collation(NATURAL_SORT);

  const total = result.total[0]?.n ?? 0;
  sendSuccess(res, { data: result.items, pagination: buildPagination(total, page, limit) });
});

export const listClassNames = asyncHandler(async (req, res) => {
  const names = await Class.distinct('name');
  names.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  sendSuccess(res, { data: names });
});

export const getClass = asyncHandler(async (req, res) => {
  const cls = await Class.findById(req.params.id);
  if (!cls) throw ApiError.notFound('Class not found');
  sendSuccess(res, { data: cls });
});

export const createClasses = asyncHandler(async (req, res) => {
  const { name: typedName, sections } = createClassSchema.parse(req.body);
  const name = await canonicalName(typedName);
  const uniqueSections = [...new Set(sections)];

  const existing = await Class.find({ name, section: { $in: uniqueSections } })
    .collation(CASE_INSENSITIVE)
    .select('section');
  const existingSet = new Set(existing.map((c) => c.section));
  const toCreate = uniqueSections.filter((s) => !existingSet.has(s));
  const skipped = uniqueSections.filter((s) => existingSet.has(s));

  if (toCreate.length === 0) {
    throw ApiError.conflict(
      skipped.length === 1
        ? `${name} – Section ${skipped[0]} already exists`
        : `These sections already exist in ${name}: ${skipped.join(', ')}`
    );
  }

  const created = await Class.insertMany(toCreate.map((section) => ({ name, section })));

  let message =
    created.length === 1
      ? `${label(created[0])} was created`
      : `${created.length} sections were added to ${name}`;
  if (skipped.length) message += `. Already existed: ${skipped.join(', ')}`;

  sendSuccess(res, { data: { created, skipped }, message, statusCode: 201 });
});

export const updateClass = asyncHandler(async (req, res) => {
  const body = updateClassSchema.parse(req.body);
  const cls = await Class.findById(req.params.id);
  if (!cls) throw ApiError.notFound('Class not found');

  if (body.name !== undefined) cls.name = await canonicalName(body.name);
  if (body.section !== undefined) cls.section = body.section;

  try {
    await cls.save();
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict(`${label(cls)} already exists`);
    throw err;
  }
  sendSuccess(res, { data: cls, message: `${label(cls)} was updated` });
});

export const deleteClass = asyncHandler(async (req, res) => {
  const cls = await Class.findById(req.params.id);
  if (!cls) throw ApiError.notFound('Class not found');

  const students = await Student.countDocuments({ class: cls._id });
  if (students > 0) {
    throw ApiError.conflict(
      `${label(cls)} has ${students} student${students === 1 ? '' : 's'}. Move or remove them first.`
    );
  }

  await cls.deleteOne();
  sendSuccess(res, { message: `${label(cls)} was deleted` });

  // Lightweight list of every class-section, used by dropdowns (student form and filters).
export const listClassOptions = asyncHandler(async (req, res) => {
    const items = await Class.find()
      .select('name section')
      .sort({ name: 1, section: 1 })
      .collation(NATURAL_SORT)
      .lean();
    sendSuccess(res, { data: items });
  });
});