import { Router } from 'express';
import * as notificationController from './controller.js';
import { CampaignController } from './campaignController.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/logs', notificationController.getLogs);
router.get('/stats', notificationController.getLogStats);

router.get('/campaigns', CampaignController.listCampaigns);
router.get('/campaigns/preview', CampaignController.previewRecipients);
router.post('/campaigns/launch', CampaignController.launchCampaign);
router.get('/templates', CampaignController.listTemplates);
router.post('/templates', CampaignController.saveTemplate);
router.delete('/templates/:id', CampaignController.deleteTemplate);
router.get('/inbox', CampaignController.listInbox);
router.post('/inbox/read', CampaignController.markRead);

export default router;
