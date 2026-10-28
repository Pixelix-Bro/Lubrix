import { Router } from 'express';
import { PaymentsController } from './controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// Webhook endpoints (called by payment providers, no JWT auth header)
router.post('/click/prepare', PaymentsController.handleClickPrepare);
router.post('/click/complete', PaymentsController.handleClickComplete);
router.post('/payme', PaymentsController.handlePayme);

// Authenticated Payment endpoints
router.post('/create-intent', requireAuth, PaymentsController.createPaymentIntent);
router.post('/pos-charge', requireAuth, PaymentsController.posCharge);
router.get('/transactions', requireAuth, PaymentsController.getTransactions);
router.get('/invoices', requireAuth, PaymentsController.getInvoices);
router.post('/invoices', requireAuth, PaymentsController.createInvoice);

export default router;
