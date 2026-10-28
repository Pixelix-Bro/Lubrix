import { Router } from 'express';
import { body } from 'express-validator';
import * as vehicleController from './controller.js';
import { requireAuth, enforceIdempotency } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.use(requireAuth);

const vehicleValidation = [
  body('customerId').trim().notEmpty().withMessage('customerId kiritilishi shart'),
  body('plateNumber').trim().notEmpty().withMessage('plateNumber kiritilishi shart'),
];

router.get('/', vehicleController.getVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.post('/', enforceIdempotency, validate(vehicleValidation), vehicleController.createVehicle);
router.patch('/:id', vehicleController.updateVehicle);
router.delete('/:id', vehicleController.deleteVehicle);

export default router;
