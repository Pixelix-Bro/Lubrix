import { Router } from 'express';
import * as analyticsController from './controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', analyticsController.getDashboard);
router.get('/overview',  analyticsController.getOverview);
router.get('/reports',   analyticsController.getReports);   // ← Yangi: 12 oylik hisobot

export default router;
