import mongoose from 'mongoose';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import {
  createStudentSchema,
  updateStudentSchema,
  listStudentsQuerySchema,
} from '../validators/student.validator.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { getPagination, buildPagination } from '../utils/pagination.js';

const CASE_INSENSITIVE = { locale: 'en', strength: 2 };
const classLabel = (c) => `${c.name} – Section ${c.section}`;

async function findClassOrFail(id) {
  const cls = await Class.findById(id);
  if (!cls) {
    throw ApiError.badRequest('The selected class was not found', [
      { field: 'classId', message: 'Choose a valid class' },
    ]);
  }
  return cls;
}

// A discount percentage needs a reason (sibling or scholarship); 0% means no discount.
function applyDiscountRules(student) {
  const percent = student.discountPercent ?? 0;
  if (percent > 0 && student.discountType === 'none') {
    throw ApiError.badRequest('Please choose sibling or scholarship for this discount', [
      { field: 'discountType', message: 'Choose sibling or scholarship' },
    ]);
  }
  if (percent === 0) student.discountType = 'none';
}

async function saveStudent(student, cls) {
  try {
    await student.save();
  } catch (err) {
    if (err.code === 11000) {
      throw ApiError.conflict(`Roll number ${student.rollNo} is already used in ${classLabel(cls)}`, [
        { field: 'rollNo', message: 'Already used in this class' },
      ]);
    }
    throw err;
  }
}

export const listStudents = asyncHandler(async (req, res) => {
  const q = listStudentsQuerySchema.parse(req.query);
  const { page, limit, skip } = getPagination(req.query);

  const filter = {};
  if (q.status) filter.status = q.status;

  if (q.classId) {
    filter.class = q.classId;
  } else if (q.className || q.section) {
    const classFilter = {};
    if (q.className) classFilter.name = q.className;
    if (q.section) classFilter.section = q.section.toUpperCase();
    const classes = await Class.find(classFilter).collation(CASE_INSENSITIVE).select('_id').lean();
    filter.class = { $in: classes.map((c) => c._id) };
  }

  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    const or = [{ name: rx }, { rollNo: rx }, { parentName: rx }];
    const digits = q.search.replace(/\D/g, '');
    if (digits.length >= 3) or.push({ parentPhone: new RegExp(escapeRegex(digits)) });
    filter.$or = or;
  }

  const [items, total] = await Promise.all([
    Student.find(filter)
      .select('-__v')
      .populate('class', 'name section')
      .sort({ name: 1 })
      .collation(CASE_INSENSITIVE)
      .skip(skip)
      .limit(limit)
      .lean(),
    Student.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, pagination: buildPagination(total, page, limit) });
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate('class', 'name section');
  if (!student) throw ApiError.notFound('Student not found');
  sendSuccess(res, { data: student });
});

export const createStudent = asyncHandler(async (req, res) => {
  const { classId, ...rest } = createStudentSchema.parse(req.body);
  const cls = await findClassOrFail(classId);

  const student = new Student({ ...rest, class: cls._id });
  applyDiscountRules(student);
  await saveStudent(student, cls);
  await student.populate('class', 'name section');

  sendSuccess(res, {
    data: student,
    message: `${student.name} was added to ${classLabel(cls)}`,
    statusCode: 201,
  });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const { classId, ...rest } = updateStudentSchema.parse(req.body);
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  const cls = classId ? await findClassOrFail(classId) : await Class.findById(student.class);

  Object.assign(student, rest);
  if (classId) student.class = cls._id;
  applyDiscountRules(student);

  await saveStudent(student, cls);
  await student.populate('class', 'name section');
  sendSuccess(res, { data: student, message: `${student.name} was updated` });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  // Students with fee records must stay in the system. The Voucher model arrives in
  // Milestone 2; this check already works because it reads the collection directly.
  const vouchers = await mongoose.connection.collection('vouchers').countDocuments({ student: student._id });
  if (vouchers > 0) {
    throw ApiError.conflict(
      `${student.name} has fee records, so the student cannot be deleted. Change the status to "Left school" instead.`
    );
  }

  await student.deleteOne();
  sendSuccess(res, { message: `${student.name} was deleted` });
});