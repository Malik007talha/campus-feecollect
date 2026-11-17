import { z } from 'zod';
import { FINE_TYPES } from '../models/SchoolSettings.js';

const optionalText = (max) =>
  z.string().trim().max(max, `Please keep this under ${max} characters`).default('');

export const settingsSchema = z.object({
  schoolName: z.string().trim().min(2, 'Please enter the school name').max(80, 'School name is too long'),
  address: optionalText(120),
  phone: optionalText(30),
  bankName: optionalText(60),
  accountTitle: optionalText(80),
  accountNumber: optionalText(40),
  paymentInstructions: optionalText(200),
});

export const finePolicySchema = z
  .object({
    fineType: z.enum(FINE_TYPES),
    fineAmount: z.number('Enter an amount').int('Enter whole rupees').min(0).max(1000000).default(0),
    finePercent: z.number('Enter a percentage').min(0).max(100, 'A percentage cannot be more than 100').default(0),
    fineGraceDays: z.number('Enter the grace days').int('Enter whole days').min(0).max(60, 'Grace days can be up to 60').default(0),
    fineCap: z.number('Enter an amount').int('Enter whole rupees').min(0).max(10000000).default(0),
  })
  .superRefine((d, ctx) => {
    if ((d.fineType === 'fixed' || d.fineType === 'per_day') && d.fineAmount < 1) {
      ctx.addIssue({ code: 'custom', path: ['fineAmount'], message: 'Enter the fine amount in rupees' });
    }
    if (d.fineType === 'percent' && d.finePercent <= 0) {
      ctx.addIssue({ code: 'custom', path: ['finePercent'], message: 'Enter a percentage between 1 and 100' });
    }
  });