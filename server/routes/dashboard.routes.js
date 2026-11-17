import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin', 'accountant'));
router.get('/', getDashboard);

export default router;