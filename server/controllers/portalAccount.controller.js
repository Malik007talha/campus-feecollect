import User from '../models/User.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import {
  createAccountSchema,
  bulkAccountsSchema,
  setActiveSchema,
  listAccountsQuerySchema,
} from '../validators/portal.validator.js';
import {
  generatePassword,
  uniqueUsername,
  createStudentUser,
  credentialOf,
  explainDuplicate,
} from '../services/portalAccount.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { getPagination, buildPagination } from '../utils/pagination.js';

const CASE_INSENSITIVE = { locale: 'en', strength: 2 };
const NATURAL = { locale: 'en', strength: 2, numericOrdering: true };
const MAX_BULK = 60; // passwords are hashed one by one, so keep each batch short

/* ---------------------------------- List ---------------------------------- */

export const listAccounts = asyncHandler(async (req, res) => {
  const q = listAccountsQuerySchema.parse(req.query);
  const { page, limit, skip } = getPagination(req.query);

  const accounts = await User.find({ role: 'student' }).select('student username isActive lastLoginAt').lean();
  const accountOf = new Map(accounts.map((a) => [String(a.student), a]));
  const withIds = accounts.map((a) => a.student);

  const filter = {};
  if (q.className || q.section) {
    const cf = {};
    if (q.className) cf.name = q.className;
    if (q.section) cf.section = q.section.toUpperCase();
    const classes = await Class.find(cf).collation(CASE_INSENSITIVE).select('_id').lean();
    filter.class = { $in: classes.map((c) => c._id) };
  }
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: rx }, { rollNo: rx }, { parentName: rx }];
  }
  if (q.account === 'with') filter._id = { $in: withIds };
  if (q.account === 'without') filter._id = { $nin: withIds };

  const [students, total, totalStudents] = await Promise.all([
    Student.find(filter)
      .select('name rollNo class status')
      .populate('class', 'name section')
      .sort({ name: 1 })
      .collation(CASE_INSENSITIVE)
      .skip(skip)
      .limit(limit)
      .lean(),
    Student.countDocuments(filter),
    Student.countDocuments(),
  ]);

  const items = students.map((s) => {
    const a = accountOf.get(String(s._id));
    return {
      ...s,
      account: a ? { username: a.username, isActive: a.isActive, lastLoginAt: a.lastLoginAt } : null,
    };
  });

  sendSuccess(res, {
    data: { items, summary: { students: totalStudents, withAccount: accounts.length } },
    pagination: buildPagination(total, page, limit),
  });
});

/* --------------------------------- Create one --------------------------------- */

export const createAccount = asyncHandler(async (req, res) => {
  const input = createAccountSchema.parse(req.body);
  const student = await Student.findById(input.studentId).populate('class', 'name section');
  if (!student) throw ApiError.notFound('Student not found');
  if (await User.exists({ student: student._id })) throw ApiError.conflict('This student already has a portal login');

  if (input.username && (await User.exists({ username: input.username }))) {
    throw ApiError.conflict('This username is already taken. Choose another.', [
      { field: 'username', message: 'Already taken' },
    ]);
  }

  const username = input.username ?? (await uniqueUsername(student));
  const password = input.password ?? generatePassword();

  try {
    await createStudentUser(student, username, password);
  } catch (err) {
    throw explainDuplicate(err);
  }

  sendSuccess(res, {
    data: { credentials: [credentialOf(student, student.class, username, password)] },
    message: `Portal login created for ${student.name}`,
    statusCode: 201,
  });
});

/* -------------------------------- Create for a class -------------------------------- */

export const createBulk = asyncHandler(async (req, res) => {
  const { className, section } = bulkAccountsSchema.parse(req.body);

  const cf = { name: className };
  if (section) cf.section = section.toUpperCase();
  const classes = await Class.find(cf).collation(CASE_INSENSITIVE).select('name section').lean();
  if (classes.length === 0) throw ApiError.notFound('That class was not found');
  const classById = new Map(classes.map((c) => [String(c._id), c]));

  const students = await Student.find({ class: { $in: classes.map((c) => c._id) }, status: 'active' })
    .select('name rollNo class')
    .lean();
  if (students.length === 0) throw ApiError.notFound('There are no active students in that class');

  const have = new Set(
    (await User.find({ student: { $in: students.map((s) => s._id) } }).select('student').lean()).map((u) => String(u.student))
  );
  const todo = students.filter((s) => !have.has(String(s._id)));
  if (todo.length === 0) throw ApiError.conflict('Every active student in this selection already has a portal login');
  if (todo.length > MAX_BULK) {
    throw ApiError.badRequest(
      `${todo.length} students need a login, which is too many at once. Please choose one section, or do ${MAX_BULK} at a time.`
    );
  }

  const order = new Map(classes.map((c, i) => [String(c._id), i]));
  todo.sort(
    (a, b) =>
      order.get(String(a.class)) - order.get(String(b.class)) || a.rollNo.localeCompare(b.rollNo, 'en', { numeric: true })
  );

  const created = [];
  const failed = [];
  for (const s of todo) {
    try {
      const username = await uniqueUsername(s); // eslint-disable-line no-await-in-loop
      const password = generatePassword();
      await createStudentUser(s, username, password); // eslint-disable-line no-await-in-loop
      created.push(credentialOf(s, classById.get(String(s.class)), username, password));
    } catch {
      failed.push(s.name);
    }
  }

  sendSuccess(res, {
    data: { credentials: created, alreadyHad: have.size, failed },
    message: `${created.length} portal ${created.length === 1 ? 'login was' : 'logins were'} created`,
    statusCode: 201,
  });
});

/* ----------------------------- Reset password and status ----------------------------- */

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ student: req.params.studentId, role: 'student' });
  if (!user) throw ApiError.notFound('This student has no portal login yet');
  const student = await Student.findById(req.params.studentId).populate('class', 'name section');

  const password = generatePassword();
  user.password = password; // hashed by the model, and old sessions stop working
  await user.save();

  sendSuccess(res, {
    data: { credentials: [credentialOf(student ?? { _id: user.student, name: user.name, rollNo: '' }, student?.class, user.username, password)] },
    message: `New password created for ${user.name}`,
  });
});

export const setActive = asyncHandler(async (req, res) => {
  const { isActive } = setActiveSchema.parse(req.body);
  const user = await User.findOneAndUpdate(
    { student: req.params.studentId, role: 'student' },
    { $set: { isActive } },
    { returnDocument: 'after' }
  );
  if (!user) throw ApiError.notFound('This student has no portal login yet');
  sendSuccess(res, {
    data: { isActive: user.isActive },
    message: `${user.name}'s login is now ${isActive ? 'enabled' : 'disabled'}`,
  });
});