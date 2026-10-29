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
router.get('/commands', requireAuth, TelegramController.listCommands);
router.post('/commands', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.saveCommand);
router.delete('/commands/:id', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.deleteCommand);

router.post('/webhook/:orgId', TelegramController.handleWebhook);

export default router;
