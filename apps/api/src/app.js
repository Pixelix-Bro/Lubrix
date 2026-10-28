import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './modules/auth/routes.js';
import customerRoutes from './modules/customers/routes.js';
import vehicleRoutes from './modules/vehicles/routes.js';
import serviceRoutes from './modules/services/routes.js';
import reminderRoutes from './modules/reminders/routes.js';
import branchRoutes from './modules/branches/routes.js';
import staffRoutes from './modules/staff/routes.js';
import settingsRoutes from './modules/settings/routes.js';
import analyticsRoutes from './modules/analytics/routes.js';
import notificationRoutes from './modules/notifications/routes.js';
import telegramRoutes from './modules/telegram/routes.js';
import paymentRoutes from './modules/payments/routes.js';
import { initInventoryRoutes } from './modules/inventory/inventoryRoutes.js';
import { emitTenantEvent } from './realtime/socket.js';
import { errorHandler } from './middleware/errorHandler.js';
import { activityLogger } from './middleware/activityLogger.js';

const app = express();

// 1. Security & Protection Layer
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 1.1 Universal Activity & Audit Logger (Backend senses and permanently logs every action)
app.use(activityLogger);

// 2. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, error: 'Juda ko‘p so‘rov yuborildi. Iltimos 15 daqiqadan so‘ng urinib ko‘ring.' }
});
app.use('/api/', apiLimiter);

// 3. Health Check (Public - No Auth Required)
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Lubrix Enterprise CRM API',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// 4. Mount Modular API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/reminders', reminderRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/integrations/telegram', telegramRoutes);
app.use('/api/v1/payments', paymentRoutes);

// Mount Inventory & Product Routes
initInventoryRoutes(app, emitTenantEvent);

// 5. 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Yo‘nalish topilmadi: ${req.originalUrl}` });
});

// 6. Global Error Handler
app.use(errorHandler);

export { app };
export default app;
