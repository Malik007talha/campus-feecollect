import { Router } from 'express';
import { getReport } from '../controllers/report.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin', 'accountant'));
router.get('/:type', getReport);

export default router;