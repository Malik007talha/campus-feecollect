import crypto from 'node:crypto';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

// No look-alike characters (0/O, 1/l/I) so passwords are easy to read from a printed slip.
const LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALL = LETTERS + DIGITS;
const pick = (set) => set[crypto.randomInt(set.length)];

export function generatePassword(length = 10) {
  const chars = [pick(LETTERS), pick(DIGITS)]; // always at least one letter and one number
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const slug = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

// "Ali Raza", roll 001 -> ali.raza.001
function usernameBase(student) {
  const name = slug(student.name).slice(0, 15) || 'student';
  const roll = slug(student.rollNo).replace(/\./g, '').slice(0, 8);
  return roll ? `${name}.${roll}` : name;
}

export async function uniqueUsername(student) {
  const base = usernameBase(student);
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? base : `${base}.${i + 1}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await User.exists({ username: candidate }))) return candidate;
  }
  return `${base}.${crypto.randomInt(1000, 9999)}`;
}

export function createStudentUser(student, username, password) {
  return User.create({
    name: student.name,
    username,
    email: `${username}@students.campusfeecollect.local`, // students may have no email; this keeps the unique email rule happy
    password, // hashed by the User model
    role: 'student',
    student: student._id,
  });
}

export const credentialOf = (student, cls, username, password) => ({
  studentId: student._id,
  studentName: student.name,
  rollNo: student.rollNo,
  className: cls?.name ?? '',
  section: cls?.section ?? '',
  username,
  password,
});

export function explainDuplicate(err) {
  if (err.code !== 11000) return err;
  return ApiError.conflict(
    err.keyPattern?.student ? 'This student already has a portal login' : 'This username is already taken. Choose another.'
  );
}