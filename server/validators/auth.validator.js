import { z } from 'zod';

const strongPassword = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(72, 'Use at most 72 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or username'),
  password: z.string().min(1, 'Enter your password'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: strongPassword,
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'The new password must be different from the current one',
    path: ['newPassword'],
  });

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-z0-9._]+$/, 'Use only letters, numbers, dot and underscore'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: strongPassword,
  role: z.enum(['admin', 'accountant']),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: z.enum(['admin', 'accountant']).optional(),
  isActive: z.boolean().optional(),
  password: strongPassword.optional(),
});