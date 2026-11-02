import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { TelegramController, handleTelegramMediaUpload } from './controller.js'

const router = Router()

// Protected Bot Settings (OWNER & ADMIN)
router.get('/status', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.getStatus)
router.post('/verify', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.verifyToken)
router.post('/save', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.saveIntegration)
router.post(
  '/disconnect',
  requireAuth,
  requireRole('OWNER', 'ADMIN'),
  TelegramController.disconnect
)
router.post('/test', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.sendTestMessage)
router.post(
  '/commands/test',
  requireAuth,
  requireRole('OWNER', 'ADMIN'),
  TelegramController.sendTestCommand
)
router.post(
  '/media',
  requireAuth,
  requireRole('OWNER', 'ADMIN'),
  handleTelegramMediaUpload,
  TelegramController.uploadMedia
)
router.get('/media/:id', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.getMedia)
router.get('/services', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.listServices)
router.post('/services', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.saveService)
router.delete(
  '/services/:id',
  requireAuth,
  requireRole('OWNER', 'ADMIN'),
  TelegramController.deleteService
)
router.get('/commands', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.listCommands)
router.post('/commands', requireAuth, requireRole('OWNER', 'ADMIN'), TelegramController.saveCommand)
router.delete(
  '/commands/:id',
  requireAuth,
  requireRole('OWNER', 'ADMIN'),
  TelegramController.deleteCommand
)

router.post('/webhook/:orgId', TelegramController.handleWebhook)
router.post('/webapp/verify/:orgId', TelegramController.verifyWebAppInitData)

export default router
