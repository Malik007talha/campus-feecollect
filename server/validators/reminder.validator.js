import { z } from 'zod';
import mongoose from 'mongoose';
import { REMINDER_STATUSES, REMINDER_CHANNELS } from '../models/ReminderLog.js';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid selection');

export const SORTS = ['due_asc', 'due_desc', 'balance_desc', 'balance_asc', 'name'];

export const defaulterQuerySchema = z.object({
  search: z.string().trim().max(50).optional(),
  className: z.string().trim().max(40).optional(),
  section: z.string().trim().max(10).optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid month').optional(),
  minBalance: z.coerce.number().int().min(0).max(10000000).optional(),
  sort: z.enum(SORTS).optional(),
});

export const sendReminderSchema = z
  .object({
    voucherIds: z.array(objectId).min(1, 'Choose at least one student').max(100, 'You can remind up to 100 students at a time').optional(),
    filters: defaulterQuerySchema.optional(),
    channel: z.enum(['email', 'sms', 'both'], 'Choose how to send the reminder'),
    force: z.boolean().optional().default(false),
  })
  .refine((d) => d.voucherIds || d.filters, { message: 'Choose who to remind', path: ['voucherIds'] });

export const listRemindersQuerySchema = z.object({
  voucherId: objectId.optional(),
  status: z.enum(REMINDER_STATUSES).optional(),
  channel: z.enum(REMINDER_CHANNELS).optional(),
});