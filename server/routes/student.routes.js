import express, { Router } from 'express';
import {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../controllers/student.controller.js';
import {
  downloadTemplate,
  parseUpload,
  validateImport,
  commitImport,
} from '../controllers/studentImport.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
// The Excel file arrives as raw bytes, so no extra upload library is needed.
const xlsxBody = express.raw({ type: [XLSX_TYPE, 'application/octet-stream'], limit: '5mb' });

const router = Router();

router.use(protect);

// Import routes must stay above '/:id'
router.get('/import/template', authorize('admin'), downloadTemplate);
router.post('/import/parse', authorize('admin'), xlsxBody, parseUpload);
router.post('/import/validate', authorize('admin'), validateImport);
router.post('/import/commit', authorize('admin'), commitImport);

router.get('/', authorize('admin', 'accountant'), listStudents);
router.get('/:id', authorize('admin', 'accountant'), getStudent);
router.post('/', authorize('admin'), createStudent);
router.patch('/:id', authorize('admin'), updateStudent);
router.delete('/:id', authorize('admin'), deleteStudent);

export default router;