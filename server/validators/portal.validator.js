import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid selection');

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,30}$/, 'Use 3 to 30 letters, numbers, dots or underscores, with no spaces');

const password = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(72, 'Use at most 72 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

export const createAccountSchema = z.object({
  studentId: objectId,
  username: username.optional(),
  password: password.optional(),
});

export const bulkAccountsSchema = z.object({
  className: z.string().trim().min(1, 'Choose a class').max(40),
  section: z.string().trim().max(10).optional(),
});

export const setActiveSchema = z.object({ isActive: z.boolean('Choose enabled or disabled') });

export const listAccountsQuerySchema = z.object({
  search: z.string().trim().max(50).optional(),
  className: z.string().trim().max(40).optional(),
  section: z.string().trim().max(10).optional(),
  account: z.enum(['with', 'without']).optional(),
});