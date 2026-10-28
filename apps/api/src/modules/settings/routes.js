import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { SettingsController } from './controller.js';

const router = Router();

// General Settings
router.get('/', requireAuth, SettingsController.getSettings);
router.patch('/', requireAuth, requireRole('OWNER', 'ADMIN'), SettingsController.updateSettings);

// Account & Profile
router.put('/profile', requireAuth, SettingsController.updateProfile);

// Payment Cards (STRICT: Only OWNER)
router.get('/cards', requireAuth, SettingsController.getPaymentCards);
router.post('/cards', requireAuth, requireRole('OWNER'), SettingsController.addPaymentCard);
router.delete('/cards/:id', requireAuth, requireRole('OWNER'), SettingsController.deletePaymentCard);

// Service Lane Camera ANPR Settings
router.get('/camera', requireAuth, SettingsController.getCameraSettings);
router.post('/camera', requireAuth, requireRole('OWNER', 'ADMIN'), SettingsController.saveCameraSetting);

// Categories
router.get('/categories', requireAuth, SettingsController.getCategories);
router.post('/categories', requireAuth, requireRole('OWNER', 'ADMIN'), SettingsController.createCategory);
router.delete('/categories/:id', requireAuth, requireRole('OWNER', 'ADMIN'), SettingsController.deleteCategory);

// Audit Logs
router.get('/audit-logs', requireAuth, requireRole('OWNER', 'ADMIN'), SettingsController.getAuditLogs);

export default router;
