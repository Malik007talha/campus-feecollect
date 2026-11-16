import { z } from 'zod';
import { MAX_IMPORT_ROWS } from '../services/studentImport.service.js';

const cell = z.string().max(200).default('');

export const importRowsSchema = z.object({
  rows: z
    .array(
      z.object({
        rowNumber: z.number().int().positive(),
        data: z.object({
          name: cell,
          rollNo: cell,
          className: cell,
          section: cell,
          parentName: cell,
          parentPhone: cell,
          parentEmail: cell,
          discountType: cell,
          discountPercent: cell,
          familyId: cell,
        }),
      })
    )
    .min(1, 'There are no rows to check')
    .max(MAX_IMPORT_ROWS, `You can import up to ${MAX_IMPORT_ROWS} students at a time`),
});