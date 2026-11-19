import { Router } from 'express';
import {
  listAccounts,
  createAccount,
  createBulk,
  resetPassword,
  setActive,
} from '../controllers/portalAccount.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin'));
router.get('/', listAccounts);
router.post('/', createAccount);
router.post('/bulk', createBulk);
router.post('/:studentId/reset-password', resetPassword);
router.patch('/:studentId/status', setActive);

export default router;