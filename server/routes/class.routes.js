import { Router } from 'express';
import {
  listClasses,
  listClassNames,
  listClassOptions,
  getClass,
  createClasses,
  updateClass,
  deleteClass,
} from '../controllers/class.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/', authorize('admin', 'accountant'), listClasses);
router.get('/names', authorize('admin', 'accountant'), listClassNames); // keep above '/:id'
router.get('/options', authorize('admin', 'accountant'), listClassOptions); // keep above '/:id'
router.get('/:id', authorize('admin', 'accountant'), getClass);
router.post('/', authorize('admin'), createClasses);
router.patch('/:id', authorize('admin'), updateClass);
router.delete('/:id', authorize('admin'), deleteClass);

export default router;