import { Router } from 'express';
import { me, listMyVouchers, getMyVoucher, myVoucherPdf, myReceipt } from '../controllers/portal.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('student')); // only student logins; staff are refused
router.get('/me', me);
router.get('/vouchers', listMyVouchers);
router.get('/vouchers/:id/pdf', myVoucherPdf);
router.get('/vouchers/:id', getMyVoucher);
router.get('/payments/:id/receipt', myReceipt);

export default router;