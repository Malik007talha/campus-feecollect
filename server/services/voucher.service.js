import Class from '../models/Class.js';
import Student from '../models/Student.js';
import Voucher from '../models/Voucher.js';
import Counter from '../models/Counter.js';
import { calculateAmounts } from '../utils/feeCalc.js';
import { dueDateToDate } from '../utils/dates.js';
import { ApiError } from '../utils/ApiError.js';

const NATURAL_SORT = { locale: 'en', strength: 2, numericOrdering: true }; // case-insensitive, "Class 2" before "Class 10"
const classLabel = (c) => `${c.name} – Section ${c.section}`;

/* ------------------------------ Work out what to create ------------------------------ */

// Looks at the classes and students in scope and sorts them into: will get a voucher,
// already has one, or cannot get one because the class has no fees. Saves nothing.
export async function buildPlan({ scope, className, section, month }) {
  const filter = {};
  if (scope === 'class') {
    filter.name = className;
    if (section) filter.section = section.toUpperCase();
  }

  const classes = await Class.find(filter)
    .select('name section monthlyFees')
    .sort({ name: 1, section: 1 })
    .collation(NATURAL_SORT)
    .lean();

  if (classes.length === 0) {
    throw ApiError.notFound(
      scope === 'class' ? 'That class was not found' : 'There are no classes yet. Add classes and students first.'
    );
  }

  const classOrder = new Map(classes.map((c, i) => [String(c._id), i]));
  const classById = new Map(classes.map((c) => [String(c._id), c]));

  const students = await Student.find({ status: 'active', class: { $in: classes.map((c) => c._id) } })
    .select('name rollNo class parentName parentPhone discountPercent')
    .lean();

  students.sort(
    (a, b) =>
      classOrder.get(String(a.class)) - classOrder.get(String(b.class)) ||
      a.rollNo.localeCompare(b.rollNo, 'en', { numeric: true })
  );

  const existing = await Voucher.find({ month, student: { $in: students.map((s) => s._id) } })
    .select('student')
    .lean();
  const hasVoucher = new Set(existing.map((v) => String(v.student)));

  const toCreate = [];
  const classesWithoutFees = new Set();
  let alreadyExist = 0;
  let withoutFees = 0;

  for (const student of students) {
    if (hasVoucher.has(String(student._id))) {
      alreadyExist += 1;
      continue;
    }
    const cls = classById.get(String(student.class));
    const items = (cls.monthlyFees ?? [])
      .filter((f) => f.amount > 0)
      .map((f) => ({ head: f.head, amount: f.amount }));

    if (items.length === 0) {
      withoutFees += 1;
      classesWithoutFees.add(classLabel(cls));
      continue;
    }

    const { subtotal, discount, payable } = calculateAmounts(items, student.discountPercent);
    toCreate.push({ student, cls, items, subtotal, discount, payable });
  }

  return {
    classes,
    totalActive: students.length,
    toCreate,
    alreadyExist,
    withoutFees,
    classesWithoutFees: [...classesWithoutFees],
  };
}

export function summarizePlan(plan) {
  const byClass = new Map();
  let gross = 0;
  let discount = 0;
  let payable = 0;

  for (const row of plan.toCreate) {
    gross += row.subtotal;
    discount += row.discount;
    payable += row.payable;
    const key = String(row.cls._id);
    const entry = byClass.get(key) ?? { label: classLabel(row.cls), students: 0, amount: 0 };
    entry.students += 1;
    entry.amount += row.payable;
    byClass.set(key, entry);
  }

  return {
    willCreate: plan.toCreate.length,
    grossTotal: gross,
    discountTotal: discount,
    payableTotal: payable,
    byClass: [...byClass.values()],
  };
}

/* ----------------------------------- Voucher numbers ----------------------------------- */

// Reserves `count` numbers in ONE atomic step and returns the first one.
// Two requests at the same moment always receive different blocks.
async function reserveNumbers(month, count) {
  const counterId = `voucher:${month}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: count } },
        { upsert: true, returnDocument: 'after' }
      );
      return counter.seq - count + 1;
    } catch (err) {
      // Two requests created the counter at the very same moment: try once more.
      if (err.code !== 11000 || attempt === 1) throw err;
    }
  }
  return null;
}

/* ------------------------------------- Generate ------------------------------------- */

export async function generateVouchers({ scope, className, section, month, dueDate, userId }) {
  await Voucher.init(); // makes sure the unique {student, month} index exists before inserting

  const plan = await buildPlan({ scope, className, section, month });
  const base = {
    totalActive: plan.totalActive,
    withoutFees: plan.withoutFees,
    classesWithoutFees: plan.classesWithoutFees,
  };

  if (plan.toCreate.length === 0) {
    return { ...base, created: 0, alreadyExisted: plan.alreadyExist, totalAmount: 0 };
  }

  const dueAt = dueDateToDate(dueDate);
  const firstNumber = await reserveNumbers(month, plan.toCreate.length);
  const prefix = `FC-${month.replace('-', '')}-`;

  const docs = plan.toCreate.map((row, i) => ({
    voucherNo: prefix + String(firstNumber + i).padStart(5, '0'),
    student: row.student._id,
    class: row.cls._id,
    month,
    items: row.items,
    discount: row.discount,
    fine: 0,
    total: row.payable,
    paid: 0,
    dueDate: dueAt,
    status: 'unpaid',
    generatedBy: userId,
    studentName: row.student.name,
    rollNo: row.student.rollNo,
    className: row.cls.name,
    section: row.cls.section,
    parentName: row.student.parentName,
    parentPhone: row.student.parentPhone,
  }));

  let duplicateIndexes = new Set();
  try {
    await Voucher.insertMany(docs, { ordered: false });
  } catch (err) {
    // Reached when another request made some of the same vouchers a moment ago.
    // The database refused those duplicates; everything else was saved.
    const writeErrors = [].concat(err.writeErrors ?? []);
    const onlyDuplicates = writeErrors.length > 0 && writeErrors.every((we) => (we.code ?? we.err?.code) === 11000);
    if (!onlyDuplicates) throw err;
    duplicateIndexes = new Set(writeErrors.map((we) => we.index ?? we.err?.index));
  }

  const created = docs.length - duplicateIndexes.size;
  const totalAmount = docs.reduce((sum, d, i) => (duplicateIndexes.has(i) ? sum : sum + d.total), 0);

  return {
    ...base,
    created,
    alreadyExisted: plan.alreadyExist + duplicateIndexes.size,
    totalAmount,
  };
}