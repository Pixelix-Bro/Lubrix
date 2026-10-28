import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from './controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Ism kiritilishi shart'),
  body('email').isEmail().withMessage('Yaroqli email manzilini kiriting'),
  body('password').isLength({ min: 6 }).withMessage('Parol kamida 6 belgidan iborat bo‘lishi kerak'),
  body('organizationName').trim().notEmpty().withMessage('Tashkilot nomi kiritilishi shart'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Yaroqli email manzilini kiriting'),
  body('password').notEmpty().withMessage('Parol kiritilishi shart'),
];

router.post('/register', validate(registerValidation), authController.register);
router.post('/checkout-register', authController.checkoutRegister);
router.post('/login', validate(loginValidation), authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
