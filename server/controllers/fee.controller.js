import Class from '../models/Class.js';
import Student from '../models/Student.js';
import FeeConfiguration from '../models/FeeConfiguration.js';
import { headNameSchema, saveStructureSchema } from '../validators/fee.validator.js';
import { calculateAmounts } from '../utils/feeCalc.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

const CASE_INSENSITIVE = { locale: 'en', strength: 2 };
const NATURAL_SORT = { locale: 'en', strength: 2, numericOrdering: true }; // "Class 2" before "Class 10"
const MAX_HEADS = 20;

const same = (a, b) => a.toLowerCase() === b.toLowerCase();
const rs = (n) => `Rs ${Number(n).toLocaleString('en-PK')}`;
const classLabel = (c) => `${c.name} – Section ${c.section}`;

/* ------------------------------- Fee types ------------------------------- */

export const getHeads = asyncHandler(async (req, res) => {
  const config = await FeeConfiguration.getDefault();
  sendSuccess(res, { data: [...config.heads] });
});

export const addHead = asyncHandler(async (req, res) => {
  const { name } = headNameSchema.parse(req.body);
  const config = await FeeConfiguration.getDefault();

  if (config.heads.some((h) => same(h, name))) throw ApiError.conflict(`"${name}" already exists`);
  if (config.heads.length >= MAX_HEADS) throw ApiError.badRequest(`You can have up to ${MAX_HEADS} fee types`);

  config.heads.push(name);
  await config.save();
  sendSuccess(res, { data: [...config.heads], message: `"${name}" was added`, statusCode: 201 });
});

export const deleteHead = asyncHandler(async (req, res) => {
  const config = await FeeConfiguration.getDefault();
  const existing = config.heads.find((h) => same(h, String(req.params.name || '').trim()));
  if (!existing) throw ApiError.notFound('Fee type not found');

  const used = await Class.countDocuments({ 'monthlyFees.head': existing });
  if (used > 0) {
    throw ApiError.conflict(
      `"${existing}" is used by ${used} class ${used === 1 ? 'section' : 'sections'}. Remove it from their fees first.`
    );
  }

  config.heads = config.heads.filter((h) => h !== existing);
  await config.save();
  sendSuccess(res, { data: [...config.heads], message: `"${existing}" was removed` });
});

/* ------------------------------ Class fees ------------------------------ */

export const getStructure = asyncHandler(async (req, res) => {
  const [config, classes, counts, discounted] = await Promise.all([
    FeeConfiguration.getDefault(),
    Class.find().select('name section monthlyFees').sort({ name: 1, section: 1 }).collation(NATURAL_SORT).lean(),
    Student.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$class', n: { $sum: 1 } } }]),
    Student.find({ status: 'active', discountPercent: { $gt: 0 } })
      .select('name rollNo class discountPercent discountType')
      .sort({ name: 1 })
      .collation(CASE_INSENSITIVE)
      .lean(),
  ]);

  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));
  const discountMap = new Map();
  for (const s of discounted) {
    const k = String(s.class);
    if (!discountMap.has(k)) discountMap.set(k, []);
    discountMap.get(k).push({
      _id: s._id,
      name: s.name,
      rollNo: s.rollNo,
      percent: s.discountPercent,
      type: s.discountType,
    });
  }

  const data = classes.map((c) => {
    const fees = c.monthlyFees ?? [];
    return {
      _id: c._id,
      name: c.name,
      section: c.section,
      monthlyFees: fees,
      total: calculateAmounts(fees).subtotal,
      activeStudents: countMap.get(String(c._id)) ?? 0,
      discounts: discountMap.get(String(c._id)) ?? [],
    };
  });

  sendSuccess(res, { data: { heads: [...config.heads], classes: data } });
});

// Sets the same fees on one or more class-sections. Replaces whatever was there.
export const saveStructure = asyncHandler(async (req, res) => {
  const { classIds, fees } = saveStructureSchema.parse(req.body);
  const config = await FeeConfiguration.getDefault();

  const seen = new Set();
  const cleaned = fees.map((f) => {
    const head = config.heads.find((h) => same(h, f.head));
    if (!head) throw ApiError.badRequest(`"${f.head}" is not a fee type. Add it in the Fee types tab first.`);
    if (seen.has(head)) throw ApiError.badRequest(`${head} is listed more than once`);
    seen.add(head);
    return { head, amount: f.amount };
  });

  const ids = [...new Set(classIds)];
  const classes = await Class.find({ _id: { $in: ids } }).select('name section');
  if (classes.length !== ids.length) throw ApiError.badRequest('One of the selected classes was not found');

  await Class.updateMany({ _id: { $in: ids } }, { $set: { monthlyFees: cleaned } });

  const { subtotal } = calculateAmounts(cleaned);
  const message =
    classes.length === 1
      ? `${classLabel(classes[0])}: ${cleaned.length ? `${rs(subtotal)} per month` : 'fees removed'}`
      : `Fees saved for ${classes.length} class sections (${rs(subtotal)} per month)`;

  sendSuccess(res, { data: { updated: classes.length, total: subtotal }, message });
});

/* ------------------------------- Discounts ------------------------------- */

export const listDiscounts = asyncHandler(async (req, res) => {
  const students = await Student.find({ status: 'active', discountPercent: { $gt: 0 } })
    .select('name rollNo class discountPercent discountType')
    .populate('class', 'name section monthlyFees')
    .sort({ name: 1 })
    .collation(CASE_INSENSITIVE)
    .lean();

  const rows = students.map((s) => {
    const fees = s.class?.monthlyFees ?? [];
    const { subtotal, discount, payable } = calculateAmounts(fees, s.discountPercent);
    return {
      _id: s._id,
      name: s.name,
      rollNo: s.rollNo,
      className: s.class ? classLabel(s.class) : '—',
      discountPercent: s.discountPercent,
      discountType: s.discountType,
      hasFees: fees.length > 0,
      subtotal,
      discount,
      payable,
    };
  });

  sendSuccess(res, {
    data: {
      rows,
      totals: {
        students: rows.length,
        monthlyDiscount: rows.reduce((sum, r) => sum + r.discount, 0),
      },
    },
  });
});
