import { z } from 'zod';
import mongoose from 'mongoose';
import { STUDENT_STATUSES, DISCOUNT_TYPES } from '../models/Student.js';
import { normalizePkMobile } from '../utils/phone.js';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid selection');
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Note: no .default() here on purpose. With .partial() (used for edits) a default would
// silently reset fields the user did not send. Defaults come from the Mongoose model.
const shape = {
  name: z.string().trim().min(2, 'Student name is too short').max(80, 'Student name is too long'),
  rollNo: z.string().trim().min(1, 'Please enter the roll number').max(20, 'Roll number is too long'),
  classId: objectId,
  parentName: z.string().trim().min(2, 'Parent name is too short').max(80, 'Parent name is too long'),
  parentPhone: z
    .string()
    .trim()
    .refine((v) => normalizePkMobile(v) !== null, 'Enter a valid mobile number, for example 0300-1234567')
    .transform((v) => normalizePkMobile(v)),
  parentEmail: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === '' || EMAIL_RX.test(v), 'Enter a valid email address')
    .optional(),
  discountType: z.enum(DISCOUNT_TYPES).optional(),
  discountPercent: z
    .number('Discount must be a number')
    .min(0, 'Discount cannot be negative')
    .max(100, 'Discount cannot be more than 100%')
    .optional(),
  familyId: z.string().trim().toUpperCase().max(30, 'Family code is too long').optional(),
  status: z.enum(STUDENT_STATUSES).optional(),
};

export const createStudentSchema = z.object(shape);
export const updateStudentSchema = z.object(shape).partial();

export const listStudentsQuerySchema = z.object({
  search: z.string().trim().max(50).optional(),
  classId: objectId.optional(),
  className: z.string().trim().max(40).optional(),
  section: z.string().trim().max(10).optional(),
  status: z.enum(STUDENT_STATUSES).optional(),
});