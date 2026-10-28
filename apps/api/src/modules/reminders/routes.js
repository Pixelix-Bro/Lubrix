import { Router } from 'express';
import * as reminderController from './controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', reminderController.getReminders);
router.get('/:id', reminderController.getReminderById);
router.post('/:id/send', reminderController.sendReminder);
router.patch('/:id', reminderController.updateReminder);
router.delete('/:id', reminderController.deleteReminder);

export default router;
