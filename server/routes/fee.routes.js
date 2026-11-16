import { Router } from 'express';
import {
  getHeads,
  addHead,
  deleteHead,
  getStructure,
  saveStructure,
  listDiscounts,
} from '../controllers/fee.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/heads', getHeads);
router.post('/heads', addHead);
router.delete('/heads/:name', deleteHead);
router.get('/structure', getStructure);
router.put('/structure', saveStructure);
router.get('/discounts', listDiscounts);

export default router;