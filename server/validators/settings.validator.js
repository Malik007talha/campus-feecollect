import { z } from 'zod';

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