import { Router } from 'express';
import { listUsers, createUser, updateUser } from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('admin'));
router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);

export default router;