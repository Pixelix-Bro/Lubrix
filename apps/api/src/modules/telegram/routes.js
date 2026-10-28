import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { TelegramController } from './controller.js';

const router = Router();

// Protected Bot Settings (OWNER & ADMIN)
router.get('/status', requireAuth, TelegramController.getStatus);
router.post('/verify', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.verifyToken);
router.post('/save', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.saveIntegration);
router.post('/disconnect', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.disconnect);
router.post('/test', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.sendTestMessage);

// Public Webhook receiver (called by Telegram servers)
router.post('/webhook/:orgId', TelegramController.handleWebhook);

export default router;
