import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import {
  cancelInspection,
  createInspection,
  getInspection,
  listInspections,
  updateInspection,
} from './controller.js'

const router = Router()
router.use(requireAuth)

router.get('/', listInspections)
router.get('/:id', getInspection)
router.post('/', createInspection)
router.patch('/:id', updateInspection)
router.post('/:id/cancel', cancelInspection)

export default router
