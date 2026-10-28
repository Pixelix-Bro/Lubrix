import { Router } from 'express';
import { body } from 'express-validator';
import * as branchController from './controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.use(requireAuth);

const branchValidation = [
  body('name').trim().notEmpty().withMessage('Filial nomi kiritilishi shart'),
  body('address').trim().notEmpty().withMessage('Filial manzili kiritilishi shart'),
];

router.get('/', branchController.getBranches);
router.get('/:id', branchController.getBranchById);
router.post('/', requireRole('OWNER', 'ADMIN'), validate(branchValidation), branchController.createBranch);
router.patch('/:id', requireRole('OWNER', 'ADMIN'), branchController.updateBranch);
router.delete('/:id', requireRole('OWNER', 'ADMIN'), branchController.deleteBranch);

export default router;
