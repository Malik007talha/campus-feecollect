import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getFinePolicy,
  updateFinePolicy,
} from '../controllers/settings.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin'));
router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/fines', getFinePolicy);
router.put('/fines', updateFinePolicy);

export default router;