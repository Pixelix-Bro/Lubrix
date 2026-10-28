import { Router } from 'express';
import * as notificationController from './controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/logs', notificationController.getLogs);
router.get('/stats', notificationController.getLogStats);

export default router;
