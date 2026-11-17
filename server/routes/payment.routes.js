import { Router } from 'express';
import {
  searchOutstanding,
  recordPayment,
  listPayments,
  voucherHistory,
  getPayment,
  downloadReceipt,
} from '../controllers/payment.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin', 'accountant'));

// Payments are append-only: there are deliberately no update or delete routes.
router.get('/search', searchOutstanding);
router.get('/voucher/:voucherId', voucherHistory);
router.get('/', listPayments);
router.post('/', recordPayment);
router.get('/:id/receipt', downloadReceipt);
router.get('/:id', getPayment);

export default router;