import { z } from 'zod';
import mongoose from 'mongoose';
import { PAYMENT_METHODS } from '../models/Payment.js';
import { isRealDate } from '../utils/dates.js';
import { pkDateString } from '../utils/fine.js';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid selection');

const dateText = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date')
  .refine(isRealDate, 'Choose a valid date');

export const recordPaymentSchema = z.object({
  voucherId: objectId,
  amount: z
    .number('Enter the amount received')
    .int('Enter whole rupees, without decimals')
    .min(1, 'The amount must be at least Rs 1')
    .max(10000000, 'The amount is too large'),
  method: z.enum(PAYMENT_METHODS, 'Choose how the money was received'),
  date: dateText.refine((d) => d <= pkDateString(new Date()), 'The payment date cannot be in the future'),
  note: z.string().trim().max(200, 'Please keep the note under 200 characters').optional().default(''),
});

export const listPaymentsQuerySchema = z.object({
  from: dateText.optional(),
  to: dateText.optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  search: z.string().trim().max(50).optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(50).optional(),
});