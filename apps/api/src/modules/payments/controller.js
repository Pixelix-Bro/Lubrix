import {
  Inventory,
  Invoice,
  ServiceRecord,
  StockMovement,
  Transaction,
} from '../../models/index.js'
import { emitTenantEvent } from '../../realtime/socket.js'

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

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ success: false, error: 'To‘lov summasi noto‘g‘ri kiritildi' })
      }

      const merchantTransId = `LUBRIX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`

      const transaction = await Transaction.create({
        organizationId: req.organizationId,
        serviceId: serviceId || null,
        customerId: customerId || null,
        customerName: customerName || 'Mijoz',
        amount: Number(amount),
        currency: 'UZS',
        provider: provider.toUpperCase(),
        paymentStatus: 'PENDING',
        merchantTransactionId: merchantTransId,
        items: items || [],
        notes: notes || '',
        createdByUserId: req.userId,
      })

      // Generate payment URLs based on provider
      let paymentUrl = ''
      if (provider.toUpperCase() === 'CLICK') {
        const serviceId = process.env.CLICK_SERVICE_ID || '12345'
        const merchantId = process.env.CLICK_MERCHANT_ID || '67890'
        paymentUrl = `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${amount}&transaction_param=${transaction._id}`
      } else if (provider.toUpperCase() === 'PAYME') {
        const merchantId = process.env.PAYME_MERCHANT_ID || '6000000000000000'
        const base64Params = Buffer.from(
          `m=${merchantId};ac.order_id=${transaction._id};a=${amount * 100}`
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

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ success: false, error: 'To‘lov summasi noto‘g‘ri' })
      }

      const receiptNumber = `RCP-${Date.now().toString().slice(-6)}`
      const merchantTransId = `POS-${Date.now()}`

      // 1. Create Transaction
      const transaction = await Transaction.create({
        organizationId: req.organizationId,
        amount: Number(amount),
        currency: 'UZS',
        provider: provider.toUpperCase(),
        paymentStatus: 'PAID',
        paidAt: new Date(),
        merchantTransactionId: merchantTransId,
        receiptNumber,
        customerId: customerId || null,
        customerName: customerName || 'Mijoz',
        payerPhone: customerPhone || '',
        payerCardMasked: cardLastFour ? `**** **** **** ${cardLastFour}` : null,
        items,
        notes: notes || 'Tezkor POS to‘lovi amalga oshirildi',
        createdByUserId: req.userId,
      })

      // 2. Create Official Invoice
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
      const invoice = await Invoice.create({
        organizationId: req.organizationId,
        invoiceNumber,
        customerId: customerId || null,
        customerName: customerName || 'Mijoz',
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
          customerName: customerName || 'Mijoz',
          serviceDate: new Date(),
          odometerKm: serviceDetails?.odometerKm || 50000,
          oilBrand: serviceDetails?.oilBrand || 'Sintetik Moy',
          oilType: serviceDetails?.oilType || 'Synthetic',
          viscosity: serviceDetails?.viscosity || serviceDetails?.oilGrade || '5W-30',
          oilQuantity: serviceDetails?.liters || 4,
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
          if (inv && inv.currentQuantity >= item.quantity) {
            const before = inv.currentQuantity
            inv.currentQuantity -= item.quantity
            await inv.save()

            await StockMovement.create({
              organizationId: req.organizationId,
              productId: item.productId,
              movementType: 'OUT',
              quantityChange: -item.quantity,
              quantityBefore: before,
              quantityAfter: inv.currentQuantity,
              reason: `POS Savdo Cheki #${receiptNumber}`,
              performedByUserId: req.userId,
            })
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

  // 3. Click Webhook Handlers (Prepare & Complete)
  async handleClickPrepare(req, res) {
    try {
      const { click_trans_id, merchant_trans_id, amount } = req.body

      const trans = await Transaction.findOne({ merchantTransactionId: merchant_trans_id })
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

      return res.json({
        click_trans_id,
        merchant_trans_id,
        merchant_prepare_id: trans._id.toString(),
        error: 0,
        error_note: 'Success',
      })
    } catch (err) {
      return res.json({ error: -8, error_note: err.message })
    }
  },

  async handleClickComplete(req, res) {
    try {
      const { click_trans_id, merchant_trans_id, merchant_prepare_id, error } = req.body

      const trans = await Transaction.findById(merchant_prepare_id)
      if (!trans) {
        return res.json({
          click_trans_id,
          merchant_trans_id,
          error: -5,
          error_note: 'Tranzaksiya topilmadi',
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
    } catch (err) {
      return res.json({ error: -8, error_note: err.message })
    }
  },

  // 4. Payme Webhook Handler (JSON-RPC)
  async handlePayme(req, res) {
    const { method, params, id } = req.body

    try {
      if (method === 'CheckPerformTransaction') {
        const trans = await Transaction.findById(params.account?.order_id)
        if (!trans) {
          return res.json({
            error: {
              code: -31050,
              message: { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' },
            },
            id,
          })
        }
        return res.json({ result: { allow: true }, id })
      }

      if (method === 'CreateTransaction') {
        const trans = await Transaction.findById(params.account?.order_id)
        if (!trans) {
          return res.json({
            error: { code: -31050, message: { uz: 'Buyurtma topilmadi' } },
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
        const trans = await Transaction.findOne({ transactionId: params.id })
        if (!trans) {
          return res.json({ error: { code: -31003, message: { uz: 'Tranzaksiya topilmadi' } }, id })
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
    } catch (err) {
      return res.json({ error: { code: -32400, message: err.message }, id })
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
