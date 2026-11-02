import {
  Inventory,
  Invoice,
  Product,
  ServiceRecord,
  StockMovement,
  Transaction,
} from '../../models/index.js'
import { emitTenantEvent } from '../../realtime/socket.js'
import { TelegramService } from '../telegram/telegramService.js'
import {
  canManuallyConfirmPosPayment,
  isClickConfigured,
  isPaymeConfigured,
  verifyClickSignature,
  verifyPaymeAuthorization,
} from './providerAuth.js'

export const PaymentsController = {
  // 1. Create Payment Intent (Click, Payme, Uzum, Card)
  async createPaymentIntent(req, res, next) {
    try {
      const {
        amount,
        provider = 'CLICK',
        serviceId,
        customerId,
        customerName,
        items,
        notes,
      } = req.body

      const normalizedAmount = Number(amount)
      const normalizedProvider = String(provider).toUpperCase()
      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        return res.status(400).json({ success: false, error: 'To‘lov summasi noto‘g‘ri kiritildi' })
      }
      if (!['CLICK', 'PAYME'].includes(normalizedProvider)) {
        return res
          .status(400)
          .json({ success: false, error: 'To‘lov provayderi qo‘llab-quvvatlanmaydi' })
      }
      if (normalizedProvider === 'CLICK' && !isClickConfigured()) {
        return res
          .status(503)
          .json({ success: false, error: 'Click merchant sozlamalari to‘ldirilmagan' })
      }
      if (normalizedProvider === 'PAYME' && !isPaymeConfigured()) {
        return res
          .status(503)
          .json({ success: false, error: 'Payme merchant sozlamalari to‘ldirilmagan' })
      }

      const merchantTransId = `LUBRIX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`

      const transaction = await Transaction.create({
        organizationId: req.organizationId,
        serviceId: serviceId || null,
        customerId: customerId || null,
        customerName: customerName || 'Bir martalik mijoz',
        amount: normalizedAmount,
        currency: 'UZS',
        provider: normalizedProvider,
        paymentStatus: 'PENDING',
        merchantTransactionId: merchantTransId,
        items: items || [],
        notes: notes || '',
        createdByUserId: req.userId,
      })

      // Generate payment URLs based on provider
      let paymentUrl = ''
      if (normalizedProvider === 'CLICK') {
        const params = new URLSearchParams({
          service_id: process.env.CLICK_SERVICE_ID,
          merchant_id: process.env.CLICK_MERCHANT_ID,
          amount: String(normalizedAmount),
          transaction_param: merchantTransId,
        })
        paymentUrl = `https://my.click.uz/services/pay?${params}`
      } else if (normalizedProvider === 'PAYME') {
        const merchantId = process.env.PAYME_MERCHANT_ID
        const base64Params = Buffer.from(
          `m=${merchantId};ac.order_id=${transaction._id};a=${normalizedAmount * 100}`
        ).toString('base64')
        paymentUrl = `https://checkout.paycom.uz/${base64Params}`
      } else if (provider.toUpperCase() === 'UZUM') {
        paymentUrl = `https://www.uzumbank.uz/pay?orderId=${transaction._id}&amount=${amount}`
      }

      res.status(201).json({
        success: true,
        data: {
          transaction,
          paymentUrl,
          merchantTransactionId: merchantTransId,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  // 2. Direct POS Charge (Uzcard, Humo, Terminal, Cash)
  async posCharge(req, res, next) {
    try {
      const {
        amount,
        provider = 'TERMINAL',
        customerId,
        customerName,
        customerPhone,
        vehiclePlate,
        items = [],
        serviceDetails,
        cardLastFour,
        notes,
      } = req.body

      if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ success: false, error: 'To‘lov summasi noto‘g‘ri' })
      }

      const receiptNumber = `RCP-${Date.now().toString().slice(-6)}`
      const merchantTransId = `POS-${Date.now()}`
      const method = String(provider || 'CASH').toUpperCase()
      if (!['CASH', 'UZCARD', 'HUMO', 'CLICK', 'PAYME', 'TERMINAL'].includes(method)) {
        return res
          .status(400)
          .json({ success: false, error: 'To‘lov usuli qo‘llab-quvvatlanmaydi' })
      }
      if (method === 'CLICK' && !isClickConfigured()) {
        return res
          .status(503)
          .json({ success: false, error: 'Click merchant sozlamalari to‘ldirilmagan' })
      }
      if (method === 'PAYME' && !isPaymeConfigured()) {
        return res
          .status(503)
          .json({ success: false, error: 'Payme merchant sozlamalari to‘ldirilmagan' })
      }
      const isCash = method === 'CASH'
      const paymentStatus = isCash ? 'PAID' : 'PENDING'

      let paymentUrl = ''
      let paymeMerchantId = ''
      if (method === 'CLICK') {
        const params = new URLSearchParams({
          service_id: process.env.CLICK_SERVICE_ID,
          merchant_id: process.env.CLICK_MERCHANT_ID,
          amount: String(amount),
          transaction_param: merchantTransId,
        })
        paymentUrl = `https://my.click.uz/services/pay?${params}`
      } else if (method === 'PAYME') {
        paymeMerchantId = process.env.PAYME_MERCHANT_ID
      }

      const transaction = await Transaction.create({
        organizationId: req.organizationId,
        amount: Number(amount),
        currency: 'UZS',
        provider: method,
        paymentStatus,
        paidAt: isCash ? new Date() : null,
        merchantTransactionId: merchantTransId,
        receiptNumber,
        customerId: customerId || null,
        customerName: customerName || 'Bir martalik mijoz',
        payerPhone: customerPhone || '',
        payerCardMasked: cardLastFour ? `**** **** **** ${cardLastFour}` : null,
        items,
        notes: notes || (isCash ? 'Naqd POS to‘lovi' : 'Karta/QR to‘lovi kutilmoqda'),
        createdByUserId: req.userId,
      })

      if (method === 'PAYME') {
        const base64Params = Buffer.from(
          `m=${paymeMerchantId};ac.order_id=${transaction._id};a=${Number(amount) * 100}`
        ).toString('base64')
        paymentUrl = `https://checkout.paycom.uz/${base64Params}`
      }

      if (!isCash) {
        return res.status(201).json({
          success: true,
          pending: true,
          message: 'To‘lov kutilmoqda. Karta yoki QR orqali tasdiqlang.',
          data: {
            transaction,
            receiptNumber,
            paymentUrl,
            qrPayload: paymentUrl || `lubrix://pay/${transaction._id}?amount=${amount}`,
            requiresConfirmation: true,
          },
        })
      }

      // 2. Create Official Invoice
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
      const invoice = await Invoice.create({
        organizationId: req.organizationId,
        invoiceNumber,
        customerId: customerId || null,
        customerName: customerName || 'Bir martalik mijoz',
        customerPhone: customerPhone || '',
        vehiclePlate: vehiclePlate || '',
        items: items.map((it) => ({
          description: it.name || 'Moy almashtirish xizmati',
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice || amount,
          total: (it.quantity || 1) * (it.unitPrice || amount),
        })),
        subtotal: Number(amount),
        totalAmount: Number(amount),
        status: 'PAID',
        paymentMethod: provider.toUpperCase(),
        paidAt: new Date(),
        issuedBy: req.user?.name || 'Kassir',
      })

      // 3. Automatically record Service if vehicle info is supplied
      let serviceRecord = null
      if (vehiclePlate) {
        serviceRecord = await ServiceRecord.create({
          organizationId: req.organizationId,
          branchId: req.branchId || req.user?.branchId || 'br-main',
          customerId: customerId || 'walk-in',
          vehicleId: vehiclePlate,
          plate: vehiclePlate,
          customerName: customerName || 'Bir martalik mijoz',
          serviceDate: new Date(),
          odometerKm: Number(serviceDetails?.odometerKm) || 0,
          oilBrand: serviceDetails?.oilBrand || '—',
          oilType: serviceDetails?.oilType || '—',
          viscosity: serviceDetails?.viscosity || serviceDetails?.oilGrade || '—',
          oilQuantity: serviceDetails?.liters || 0,
          price: Number(amount),
          paymentMethod: provider.toUpperCase(),
          status: 'Tugallandi',
          notes: `POS To‘lovi: ${receiptNumber}`,
        })

        transaction.serviceId = serviceRecord._id.toString()
        await transaction.save()
      }

      // 4. Automatically deduct stock for any items included
      for (const item of items) {
        if (item.productId) {
          const inv = await Inventory.findOne({
            organizationId: req.organizationId,
            productId: item.productId,
          })
          if (!inv) continue
          const qty = Number(inv.quantity ?? inv.currentQuantity ?? 0)
          if (inv && qty >= item.quantity) {
            const before = qty
            const after = qty - item.quantity
            inv.quantity = after
            await inv.save()

            await StockMovement.create({
              organizationId: req.organizationId,
              branchId: inv.branchId,
              productId: item.productId,
              type: 'STOCK_OUT',
              quantityChanged: -item.quantity,
              quantityBefore: before,
              quantityAfter: after,
              reason: `POS chek #${receiptNumber}`,
              userName: req.user?.name || 'Kassir',
            })
            if (before > inv.minStockLevel && after <= inv.minStockLevel) {
              const product = await Product.findOne({
                _id: item.productId,
                organizationId: req.organizationId,
              })
              await TelegramService.notifyOwner(req.organizationId, 'lowStock', {
                productName: product?.name || item.name || 'Mahsulot',
                quantity: after,
              })
            }
          }
        }
      }

      // 5. Emit real-time POS event
      emitTenantEvent(req.organizationId, 'PAYMENT_RECEIVED', {
        transactionId: transaction._id,
        receiptNumber,
        amount,
        customerName,
        provider,
      })

      res.status(201).json({
        success: true,
        message: 'To‘lov muvaffaqiyatli qabul qilindi va chek chop etildi!',
        data: {
          transaction,
          invoice,
          serviceRecord,
          receiptNumber,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  async confirmPosPayment(req, res, next) {
    try {
      const { transactionId, cardLastFour } = req.body
      const trans = await Transaction.findOne({
        _id: transactionId,
        organizationId: req.organizationId,
      })
      if (!trans) {
        return res.status(404).json({ success: false, error: 'Tranzaksiya topilmadi' })
      }
      if (trans.paymentStatus === 'PAID') {
        return res.json({ success: true, data: trans })
      }
      if (!canManuallyConfirmPosPayment(trans.provider)) {
        return res.status(409).json({
          success: false,
          error: 'Ushbu to‘lov faqat to‘lov provayderining server tasdig‘i bilan yakunlanadi',
        })
      }

      trans.paymentStatus = 'PAID'
      trans.paidAt = new Date()
      if (cardLastFour) trans.payerCardMasked = `**** **** **** ${cardLastFour}`
      trans.notes = 'Karta/QR to‘lovi tasdiqlandi'
      await trans.save()

      for (const item of trans.items || []) {
        if (!item.productId) continue
        const inv = await Inventory.findOne({
          organizationId: req.organizationId,
          productId: item.productId,
        })
        const qty = Number(inv?.quantity ?? 0)
        if (inv && qty >= (item.quantity || 0)) {
          const before = qty
          const after = qty - item.quantity
          inv.quantity = after
          await inv.save()
          await StockMovement.create({
            organizationId: req.organizationId,
            branchId: inv.branchId,
            productId: item.productId,
            type: 'STOCK_OUT',
            quantityChanged: -item.quantity,
            quantityBefore: before,
            quantityAfter: after,
            reason: `POS chek #${trans.receiptNumber}`,
            userName: req.user?.name || 'Kassir',
          })
          if (before > inv.minStockLevel && after <= inv.minStockLevel) {
            const product = await Product.findOne({
              _id: item.productId,
              organizationId: req.organizationId,
            })
            await TelegramService.notifyOwner(req.organizationId, 'lowStock', {
              productName: product?.name || item.name || 'Mahsulot',
              quantity: after,
            })
          }
        }
      }

      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
      const invoice = await Invoice.create({
        organizationId: req.organizationId,
        invoiceNumber,
        customerId: trans.customerId || null,
        customerName: trans.customerName || 'Bir martalik mijoz',
        customerPhone: trans.payerPhone || '',
        items: (trans.items || []).map((it) => ({
          description: it.name || 'Xizmat',
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice || trans.amount,
          total: it.total || trans.amount,
        })),
        subtotal: Number(trans.amount),
        totalAmount: Number(trans.amount),
        status: 'PAID',
        paymentMethod: trans.provider,
        paidAt: new Date(),
        issuedBy: req.user?.name || 'Kassir',
      })

      emitTenantEvent(req.organizationId, 'PAYMENT_RECEIVED', {
        transactionId: trans._id,
        receiptNumber: trans.receiptNumber,
        amount: trans.amount,
        customerName: trans.customerName,
        provider: trans.provider,
      })

      res.json({
        success: true,
        message: 'To‘lov tasdiqlandi',
        data: { transaction: trans, invoice, receiptNumber: trans.receiptNumber },
      })
    } catch (err) {
      next(err)
    }
  },

  async getTransaction(req, res, next) {
    try {
      const trans = await Transaction.findOne({
        _id: req.params.id,
        organizationId: req.organizationId,
      })
      if (!trans) {
        return res.status(404).json({ success: false, error: 'Tranzaksiya topilmadi' })
      }
      res.json({ success: true, data: trans })
    } catch (err) {
      next(err)
    }
  },

  // 3. Click Webhook Handlers (Prepare & Complete)
  async handleClickPrepare(req, res) {
    try {
      const { click_trans_id, merchant_trans_id, amount } = req.body

      if (!verifyClickSignature(req.body, 0)) {
        return res.json({
          click_trans_id,
          merchant_trans_id,
          error: -1,
          error_note: 'Sign check failed',
        })
      }

      const trans = await Transaction.findOne({
        merchantTransactionId: merchant_trans_id,
        provider: 'CLICK',
      })
      if (!trans) {
        return res.json({
          click_trans_id,
          merchant_trans_id,
          error: -5,
          error_note: 'Tranzaksiya topilmadi',
        })
      }

      if (Number(trans.amount) !== Number(amount)) {
        return res.json({
          click_trans_id,
          merchant_trans_id,
          error: -2,
          error_note: 'Summa mos kelmadi',
        })
      }
      if (trans.paymentStatus !== 'PENDING') {
        return res.json({
          click_trans_id,
          merchant_trans_id,
          error: -4,
          error_note: 'Payment is not pending',
        })
      }

      return res.json({
        click_trans_id,
        merchant_trans_id,
        merchant_prepare_id: trans._id.toString(),
        error: 0,
        error_note: 'Success',
      })
    } catch {
      return res.json({ error: -8, error_note: 'Internal error' })
    }
  },

  async handleClickComplete(req, res) {
    try {
      const { click_trans_id, merchant_trans_id, merchant_prepare_id, amount, error } = req.body

      if (!verifyClickSignature(req.body, 1)) {
        return res.json({
          click_trans_id,
          merchant_trans_id,
          error: -1,
          error_note: 'Sign check failed',
        })
      }

      const trans = await Transaction.findOne({
        _id: merchant_prepare_id,
        merchantTransactionId: merchant_trans_id,
        provider: 'CLICK',
      })
      if (!trans) {
        return res.json({
          click_trans_id,
          merchant_trans_id,
          error: -5,
          error_note: 'Tranzaksiya topilmadi',
        })
      }

      if (Number(trans.amount) !== Number(amount)) {
        return res.json({
          click_trans_id,
          merchant_trans_id,
          error: -2,
          error_note: 'Incorrect amount',
        })
      }

      if (trans.paymentStatus === 'PAID') {
        return res.json({
          click_trans_id,
          merchant_trans_id,
          merchant_confirm_id: trans._id.toString(),
          error: 0,
          error_note: 'Success',
        })
      }
      if (trans.paymentStatus !== 'PENDING') {
        return res.json({
          click_trans_id,
          merchant_trans_id,
          error: -4,
          error_note: 'Payment is not pending',
        })
      }

      if (error < 0) {
        trans.paymentStatus = 'FAILED'
        await trans.save()
        return res.json({ click_trans_id, merchant_trans_id, error, error_note: 'Failed by Click' })
      }

      trans.paymentStatus = 'PAID'
      trans.transactionId = String(click_trans_id)
      trans.paidAt = new Date()
      await trans.save()

      emitTenantEvent(trans.organizationId, 'PAYMENT_RECEIVED', {
        transactionId: trans._id,
        amount: trans.amount,
        provider: 'CLICK',
      })

      return res.json({
        click_trans_id,
        merchant_trans_id,
        merchant_confirm_id: trans._id.toString(),
        error: 0,
        error_note: 'Success',
      })
    } catch {
      return res.json({ error: -8, error_note: 'Internal error' })
    }
  },

  // 4. Payme Webhook Handler (JSON-RPC)
  async handlePayme(req, res) {
    const { method, params = {}, id } = req.body || {}
    if (!verifyPaymeAuthorization(req.headers.authorization)) {
      return res.status(200).json({
        error: { code: -32504, message: { uz: 'Ruxsat berilmagan' } },
        id,
      })
    }

    try {
      if (method === 'CheckPerformTransaction') {
        const trans = await Transaction.findById(params.account?.order_id)
        if (!trans || trans.provider !== 'PAYME') {
          return res.json({
            error: {
              code: -31050,
              message: { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' },
            },
            id,
          })
        }
        if (Number(params.amount) !== Number(trans.amount) * 100) {
          return res.json({ error: { code: -31001, message: { uz: 'Summa noto‘g‘ri' } }, id })
        }
        return res.json({ result: { allow: true }, id })
      }

      if (method === 'CreateTransaction') {
        const trans = await Transaction.findById(params.account?.order_id)
        if (!trans || trans.provider !== 'PAYME') {
          return res.json({
            error: { code: -31050, message: { uz: 'Buyurtma topilmadi' } },
            id,
          })
        }
        if (Number(params.amount) !== Number(trans.amount) * 100) {
          return res.json({ error: { code: -31001, message: { uz: 'Summa noto‘g‘ri' } }, id })
        }
        if (trans.paymentStatus !== 'PENDING') {
          return res.json({
            error: { code: -31008, message: { uz: 'Buyurtma muddati tugagan' } },
            id,
          })
        }
        trans.transactionId = params.id
        trans.paymentStatus = 'PENDING'
        await trans.save()

        return res.json({
          result: {
            create_time: Date.now(),
            transaction: trans._id.toString(),
            state: 1,
          },
          id,
        })
      }

      if (method === 'PerformTransaction') {
        const trans = await Transaction.findOne({ transactionId: params.id, provider: 'PAYME' })
        if (!trans) {
          return res.json({ error: { code: -31003, message: { uz: 'Tranzaksiya topilmadi' } }, id })
        }
        if (trans.paymentStatus === 'PAID') {
          return res.json({
            result: {
              perform_time: trans.paidAt?.getTime() || Date.now(),
              transaction: trans._id.toString(),
              state: 2,
            },
            id,
          })
        }
        if (trans.paymentStatus !== 'PENDING') {
          return res.json({
            error: { code: -31008, message: { uz: 'Buyurtma muddati tugagan' } },
            id,
          })
        }
        trans.paymentStatus = 'PAID'
        trans.paidAt = new Date()
        await trans.save()

        emitTenantEvent(trans.organizationId, 'PAYMENT_RECEIVED', {
          transactionId: trans._id,
          amount: trans.amount,
          provider: 'PAYME',
        })

        return res.json({
          result: {
            perform_time: Date.now(),
            transaction: trans._id.toString(),
            state: 2,
          },
          id,
        })
      }

      return res.json({ error: { code: -32601, message: 'Method not found' }, id })
    } catch {
      return res.json({ error: { code: -32400, message: { uz: 'Ichki server xatosi' } }, id })
    }
  },

  // 5. Get All Transactions for Organization
  async getTransactions(req, res, next) {
    try {
      const { status, provider, limit = 50, page = 1 } = req.query
      const filter = { organizationId: req.organizationId }

      if (status) filter.paymentStatus = status.toUpperCase()
      if (provider) filter.provider = provider.toUpperCase()

      const skip = (Number(page) - 1) * Number(limit)

      const [transactions, total, stats] = await Promise.all([
        Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Transaction.countDocuments(filter),
        Transaction.aggregate([
          { $match: { organizationId: req.organizationId, paymentStatus: 'PAID' } },
          { $group: { _id: null, totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
      ])

      res.json({
        success: true,
        data: transactions,
        total,
        page: Number(page),
        totalRevenue: stats[0]?.totalRevenue || 0,
        paidCount: stats[0]?.count || 0,
      })
    } catch (err) {
      next(err)
    }
  },

  // 6. Invoices Management
  async getInvoices(req, res, next) {
    try {
      const invoices = await Invoice.find({ organizationId: req.organizationId })
        .sort({ createdAt: -1 })
        .limit(50)
      res.json({ success: true, data: invoices })
    } catch (err) {
      next(err)
    }
  },

  async createInvoice(req, res, next) {
    try {
      const {
        customerName,
        customerPhone,
        vehiclePlate,
        items,
        discount = 0,
        tax = 0,
        paymentMethod = 'TERMINAL',
      } = req.body

      if (!customerName || !items || !items.length) {
        return res
          .status(400)
          .json({ success: false, error: 'Mijoz ismi va mahsulotlar ro‘yxati talab qilinadi' })
      }

      const subtotal = items.reduce(
        (acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
        0
      )
      const totalAmount = Math.max(0, subtotal - Number(discount) + Number(tax))
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`

      const invoice = await Invoice.create({
        organizationId: req.organizationId,
        invoiceNumber,
        customerName,
        customerPhone: customerPhone || '',
        vehiclePlate: vehiclePlate || '',
        items,
        subtotal,
        discount: Number(discount),
        tax: Number(tax),
        totalAmount,
        status: 'ISSUED',
        paymentMethod,
        issuedBy: req.user?.name || 'Boshqaruvchi',
      })

      res.status(201).json({ success: true, data: invoice })
    } catch (err) {
      next(err)
    }
  },
}
