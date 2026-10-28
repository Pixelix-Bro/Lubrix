import { Router } from 'express';
import { body } from 'express-validator';
import * as staffController from './controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.use(requireAuth);

const staffValidation = [
  body('name').trim().notEmpty().withMessage('Ism kiritilishi shart'),
  body('email').isEmail().withMessage('Yaroqli email kiriting'),
];

router.get('/', staffController.getStaff);
router.get('/:id', staffController.getStaffById);
router.post('/', requireRole('OWNER', 'ADMIN'), validate(staffValidation), staffController.createStaff);
router.patch('/:id', requireRole('OWNER', 'ADMIN'), staffController.updateStaff);
router.delete('/:id', requireRole('OWNER', 'ADMIN'), staffController.deleteStaff);

export default router;
