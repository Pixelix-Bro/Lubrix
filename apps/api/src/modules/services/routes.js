import { Router } from 'express';
import { body } from 'express-validator';
import * as serviceController from './controller.js';
import { requireAuth, enforceIdempotency } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.use(requireAuth);

const serviceValidation = [
  body('customerId').trim().notEmpty().withMessage('customerId kiritilishi shart'),
  body('vehicleId').trim().notEmpty().withMessage('vehicleId kiritilishi shart'),
  body('odometerKm').isNumeric().withMessage('odometerKm raqam bo‘lishi kerak'),
];

router.get('/', serviceController.getServices);
router.get('/stats', serviceController.getServiceStats);
router.get('/:id', serviceController.getServiceById);
router.post('/', enforceIdempotency, validate(serviceValidation), serviceController.createService);
router.patch('/:id', serviceController.updateService);
router.delete('/:id', serviceController.deleteService);

export default router;
