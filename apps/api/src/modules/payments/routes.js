import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { PaymentsController } from './controller.js'
import { SignupPaymentsController } from './signupController.js'

const router = Router()

// Webhook endpoints (called by payment providers, no JWT auth header)
router.post('/click/prepare', PaymentsController.handleClickPrepare)
router.post('/click/complete', PaymentsController.handleClickComplete)
router.post('/payme', PaymentsController.handlePayme)
router.post('/signup/click/prepare', SignupPaymentsController.clickPrepare)
router.post('/signup/click/complete', SignupPaymentsController.clickComplete)
router.post('/signup/payme', SignupPaymentsController.payme)
router.post('/signup/intents', SignupPaymentsController.createIntent)
router.get('/signup/intents/:id', SignupPaymentsController.getIntentStatus)

// Authenticated Payment endpoints
router.post('/create-intent', requireAuth, PaymentsController.createPaymentIntent)
router.post('/pos-charge', requireAuth, PaymentsController.posCharge)
router.post('/pos-confirm', requireAuth, PaymentsController.confirmPosPayment)
router.get('/transactions/:id', requireAuth, PaymentsController.getTransaction)
router.get('/transactions', requireAuth, PaymentsController.getTransactions)
router.get('/invoices', requireAuth, PaymentsController.getInvoices)
router.post('/invoices', requireAuth, PaymentsController.createInvoice)

export default router
