import { Router } from 'express';
import { body } from 'express-validator';
import * as customerController from './controller.js';
import { requireAuth, enforceIdempotency } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

// All customer routes require authentication
router.use(requireAuth);

const customerValidation = [
  body('fullName').trim().notEmpty().withMessage('fullName kiritilishi shart'),
  body('phone').custom((val, { req }) => Boolean(val || req.body.phoneE164)).withMessage('Telefon raqami kiritilishi shart'),
];

router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', enforceIdempotency, validate(customerValidation), customerController.createCustomer);
router.patch('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

export default router;
