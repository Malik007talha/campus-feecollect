import { Router } from 'express';
import {
  previewVouchers,
  generateVouchers,
  listVouchers,
  getVoucher,
} from '../controllers/voucher.controller.js';
import { downloadVoucherPdf, downloadBulkPdf } from '../controllers/voucherPdf.controller.js';
import { deleteVoucher } from '../controllers/voucherDelete.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin', 'accountant'));

router.post('/preview', previewVouchers);
router.post('/generate', generateVouchers);
router.get('/pdf', downloadBulkPdf); // must stay above '/:id'
router.get('/', listVouchers);
router.get('/:id/pdf', downloadVoucherPdf);
router.get('/:id', getVoucher);
router.delete('/:id', authorize('admin'), deleteVoucher); // Admin only

export default router;