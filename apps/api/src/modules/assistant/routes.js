import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../../middleware/auth.js'
import { AssistantController } from './controller.js'

const router = Router()
const assistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'AI so‘rovlari limiti tugadi. Birozdan keyin qayta urinib ko‘ring.',
  },
})

router.use(requireAuth, assistantLimiter)
router.post('/ask', AssistantController.ask)
router.post('/analyze-plate', AssistantController.analyzePlate)

export default router
