import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid selection');

export const headNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Fee name is too short')
    .max(40, 'Fee name is too long')
    .transform((s) => s.replace(/\s+/g, ' ')),
});

const feeLine = z.object({
  head: z.string().trim().min(1, 'Choose a fee type'),
  amount: z
    .number('Enter an amount')
    .int('Enter whole rupees, without decimals')
    .min(0, 'Amount cannot be negative')
    .max(10000000, 'Amount is too large'),
});

export const saveStructureSchema = z.object({
  classIds: z.array(objectId).min(1, 'Choose at least one class').max(200, 'Too many classes selected'),
  fees: z.array(feeLine).max(20, 'Too many fee lines'),
});
