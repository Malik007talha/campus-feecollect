import { z } from 'zod';
import { VOUCHER_STATUSES } from '../models/Voucher.js';
import { currentMonthKey, shiftMonth, isRealDate } from '../utils/dates.js';

const monthKey = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Choose a valid month')
  .refine((v) => {
    const now = currentMonthKey();
    return v >= shiftMonth(now, -12) && v <= shiftMonth(now, 3);
  }, 'Choose a month between 12 months ago and 3 months ahead');

const dateText = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid due date')
  .refine(isRealDate, 'Choose a valid due date');

export const generateSchema = z
  .object({
    scope: z.enum(['school', 'class']),
    className: z.string().trim().max(40).optional(),
    section: z.string().trim().max(10).optional(),
    month: monthKey,
    dueDate: dateText,
  })
  .superRefine((d, ctx) => {
    if (d.scope === 'class' && !d.className) {
      ctx.addIssue({ code: 'custom', path: ['className'], message: 'Choose a class' });
    }
    if (d.dueDate < `${d.month}-01`) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'The due date cannot be before the start of the billing month',
      });
    }
  });

export const listVouchersQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid month').optional(),
  status: z.enum(VOUCHER_STATUSES).optional(),
  className: z.string().trim().max(40).optional(),
  section: z.string().trim().max(10).optional(),
  search: z.string().trim().max(50).optional(),
});