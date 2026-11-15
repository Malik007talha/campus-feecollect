import { z } from 'zod';

const className = z.string().trim().min(1, 'Please enter the class name').max(40, 'Class name is too long');

const sectionName = z
  .string()
  .trim()
  .min(1, 'Please enter the section')
  .max(10, 'Section name is too long')
  .transform((s) => s.toUpperCase());

export const createClassSchema = z.object({
  name: className,
  sections: z.array(sectionName).min(1, 'Add at least one section').max(12, 'You can add up to 12 sections at once'),
});

export const updateClassSchema = z
  .object({ name: className.optional(), section: sectionName.optional() })
  .refine((d) => d.name !== undefined || d.section !== undefined, { message: 'Nothing to update' });

export const listClassesQuerySchema = z.object({
  search: z.string().trim().max(50).optional(),
  name: z.string().trim().max(40).optional(),
});