import { Router } from 'express';
import {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../controllers/student.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/', authorize('admin', 'accountant'), listStudents);
router.get('/:id', authorize('admin', 'accountant'), getStudent);
router.post('/', authorize('admin'), createStudent);
router.patch('/:id', authorize('admin'), updateStudent);
router.delete('/:id', authorize('admin'), deleteStudent);

export default router;