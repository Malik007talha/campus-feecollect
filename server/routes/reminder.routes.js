import { Router } from 'express';
import { reminderStatus, sendReminder, listReminders } from '../controllers/reminder.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin', 'accountant'));
router.get('/status', reminderStatus);
router.post('/send', sendReminder);
router.get('/', listReminders);

export default router;