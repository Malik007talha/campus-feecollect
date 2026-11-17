import { z } from 'zod';
import { isRealDate } from '../utils/dates.js';

export const REPORT_TYPES = ['collection', 'pending', 'classwise', 'history', 'defaulters', 'discounts'];

const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Choose a valid month');
const dateText = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date')
  .refine(isRealDate, 'Choose a valid date');

export const reportQuerySchema = z
  .object({
    month: monthKey.optional(),
    from: dateText.optional(),
    to: dateText.optional(),
    className: z.string().trim().max(40).optional(),
    section: z.string().trim().max(10).optional(),
    search: z.string().trim().max(50).optional(),
  })
  .refine((d) => !d.from || !d.to || d.from <= d.to, {
    message: 'The start date cannot be after the end date',
    path: ['from'],
  });

export const dashboardQuerySchema = z.object({ month: monthKey.optional() });