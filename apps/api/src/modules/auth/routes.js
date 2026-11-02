import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { body } from 'express-validator'
import { requireAuth } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as authController from './controller.js'

const router = Router()
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Urinishlar soni oshdi. 15 daqiqadan so‘ng qayta urinib ko‘ring.',
  },
})

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Ism kiritilishi shart'),
  body('email').isEmail().withMessage('Yaroqli email manzilini kiriting'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Parol kamida 6 belgidan iborat bo‘lishi kerak'),
  body('organizationName').trim().notEmpty().withMessage('Tashkilot nomi kiritilishi shart'),
]

const loginValidation = [
  body('email').isEmail().withMessage('Yaroqli email manzilini kiriting'),
  body('password').notEmpty().withMessage('Parol kiritilishi shart'),
]

router.post('/register', validate(registerValidation), authController.register)
router.post('/checkout-register', authController.checkoutRegister)
router.get('/csrf', authController.getCsrfToken)
router.post('/login', loginLimiter, validate(loginValidation), authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)
router.get('/me', requireAuth, authController.me)
router.get('/sessions', requireAuth, authController.listSessions)
router.delete('/sessions/:id', requireAuth, authController.revokeSession)

export default router
