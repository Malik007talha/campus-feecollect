import { Router } from 'express';
import { listDefaulters } from '../controllers/defaulter.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin', 'accountant'));
router.get('/', listDefaulters);

export default router;