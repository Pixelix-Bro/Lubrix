import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { Organization, SignupPayment, User } from '../../models/index.js'
import {
  isClickConfigured as clickConfigured,
  isPaymeConfigured as paymeConfigured,
  verifyClickSignature,
  verifyPaymeAuthorization,
} from './providerAuth.js'

const PLAN_PRICES = {
  Starter: { month: 19, year: 190 },
  Professional: { month: 49, year: 490 },
  Enterprise: { month: 99, year: 990 },
}

const createSlug = (name) => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${base || 'lubrix'}-${crypto.randomBytes(3).toString('hex')}`
}

const makePaymentUrl = (payment, provider) => {
  if (provider === 'CLICK') {
    const params = new URLSearchParams({
      service_id: process.env.CLICK_SERVICE_ID,
      merchant_id: process.env.CLICK_MERCHANT_ID,
      amount: String(payment.amount),
      transaction_param: payment.merchantTransactionId,
    })
    return `https://my.click.uz/services/pay?${params}`
  }

  const params = Buffer.from(
    `m=${process.env.PAYME_MERCHANT_ID};ac.order_id=${payment._id};a=${payment.amount * 100}`
  ).toString('base64')
  return `https://checkout.paycom.uz/${params}`
}

const activatePaidSignup = async (payment) => {
  const claim = await SignupPayment.findOneAndUpdate(
    { _id: payment._id, paymentStatus: 'PENDING' },
    { $set: { paymentStatus: 'PROCESSING' } },
    { new: true }
  )
  if (!claim) return SignupPayment.findById(payment._id)

  let organization
  try {
    const existing = await User.findOne({ email: claim.email })
    if (existing) throw new Error('Ushbu email bilan akkaunt mavjud')

    const subscriptionExpiresAt = new Date()
    subscriptionExpiresAt.setMonth(
      subscriptionExpiresAt.getMonth() + (claim.billingCycle === 'year' ? 12 : 1)
    )

    organization = await Organization.create({
      name: claim.organizationName,
      slug: createSlug(claim.organizationName),
      countryCode: 'UZ',
      currency: 'UZS',
      timezone: 'Asia/Tashkent',
      defaultLocale: 'uz',
      status: 'active',
      subscriptionPlan: claim.planName.toUpperCase(),
      subscriptionStatus: 'ACTIVE',
      subscriptionExpiresAt,
    })

    const user = await User.create({
      name: claim.name,
      email: claim.email,
      passwordHash: claim.passwordHash,
      organizationId: organization._id.toString(),
      role: 'OWNER',
      phone: claim.phone,
      isActive: true,
      lastLogin: new Date(),
    })

    claim.paymentStatus = 'PAID'
    claim.paidAt = claim.paidAt || new Date()
    claim.userId = user._id.toString()
    claim.organizationId = organization._id.toString()
    await claim.save()
    return claim
  } catch (error) {
    if (organization) await Organization.deleteOne({ _id: organization._id }).catch(() => {})
    claim.paymentStatus = 'FAILED'
    await claim.save()
    throw error
  }
}

const clickReply = (body, error, errorNote, extras = {}) => ({
  click_trans_id: body.click_trans_id,
  merchant_trans_id: body.merchant_trans_id,
  error,
  error_note: errorNote,
  ...extras,
})

export const SignupPaymentsController = {
  async createIntent(req, res, next) {
    try {
      const {
        name,
        email,
        organizationName,
        phone = '',
        password,
        planName,
        billingCycle = 'month',
        provider,
      } = req.body
      const cleanEmail = String(email || '')
        .toLowerCase()
        .trim()
      const cleanName = String(name || '').trim()
      const cleanOrganization = String(organizationName || '').trim()
      const planPrices = PLAN_PRICES[planName]
      const providerName = String(provider || '').toUpperCase()

      if (!cleanName || !cleanEmail || !cleanOrganization || !password || !planPrices) {
        return res
          .status(400)
          .json({ success: false, error: 'Ro‘yxatdan o‘tish ma’lumotlari noto‘liq.' })
      }
      if (!['month', 'year'].includes(billingCycle)) {
        return res.status(400).json({ success: false, error: 'To‘lov davri noto‘g‘ri.' })
      }
      if (!['CLICK', 'PAYME'].includes(providerName)) {
        return res
          .status(400)
          .json({ success: false, error: 'Click yoki Payme to‘lov usulini tanlang.' })
      }
      if (providerName === 'CLICK' && !clickConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'Click merchant sozlamalari server .env faylida to‘ldirilmagan.',
        })
      }
      if (providerName === 'PAYME' && !paymeConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'Payme merchant sozlamalari server .env faylida to‘ldirilmagan.',
        })
      }
      if (await User.findOne({ email: cleanEmail })) {
        return res.status(409).json({ success: false, error: 'Ushbu email bilan akkaunt mavjud.' })
      }

      const usdToUzs = Number(process.env.USD_TO_UZS_RATE)
      if (!Number.isFinite(usdToUzs) || usdToUzs <= 0) {
        return res
          .status(503)
          .json({ success: false, error: 'USD_TO_UZS_RATE server sozlamasida ko‘rsatilmagan.' })
      }

      const amount = Math.round(planPrices[billingCycle] * usdToUzs)
      const payment = await SignupPayment.create({
        publicId: crypto.randomUUID(),
        name: cleanName,
        email: cleanEmail,
        organizationName: cleanOrganization,
        phone: String(phone).trim(),
        passwordHash: await bcrypt.hash(password, 12),
        planName,
        billingCycle,
        amount,
        provider: providerName,
        merchantTransactionId: `SIGNUP-${crypto.randomUUID()}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      })
      const paymentUrl = makePaymentUrl(payment, providerName)

      return res.status(201).json({
        success: true,
        data: {
          paymentId: payment.publicId,
          provider: providerName,
          paymentUrl,
          amount,
          currency: 'UZS',
          expiresAt: payment.expiresAt,
        },
      })
    } catch (error) {
      next(error)
    }
  },

  async getIntentStatus(req, res, next) {
    try {
      const payment = await SignupPayment.findOne({ publicId: req.params.id }).select(
        'paymentStatus provider planName amount currency expiresAt'
      )
      if (!payment) return res.status(404).json({ success: false, error: 'To‘lov topilmadi.' })
      if (payment.paymentStatus === 'PENDING' && payment.expiresAt <= new Date()) {
        payment.paymentStatus = 'FAILED'
        await payment.save()
      }
      const data = {
        paymentStatus: payment.paymentStatus,
        provider: payment.provider,
        planName: payment.planName,
        amount: payment.amount,
        currency: payment.currency,
        expiresAt: payment.expiresAt,
      }
      return res.json({
        success: true,
        data,
      })
    } catch (error) {
      next(error)
    }
  },

  async clickPrepare(req, res) {
    const body = req.body
    try {
      if (!verifyClickSignature(body, 0)) {
        return res.json(clickReply(body, -1, 'Sign check failed'))
      }
      const payment = await SignupPayment.findOne({ merchantTransactionId: body.merchant_trans_id })
      if (!payment || payment.provider !== 'CLICK')
        return res.json(clickReply(body, -5, 'Order not found'))
      if (payment.expiresAt <= new Date() || payment.paymentStatus !== 'PENDING') {
        return res.json(clickReply(body, -4, 'Order is no longer payable'))
      }
      if (Number(payment.amount) !== Number(body.amount))
        return res.json(clickReply(body, -2, 'Incorrect amount'))
      return res.json(
        clickReply(body, 0, 'Success', { merchant_prepare_id: payment._id.toString() })
      )
    } catch {
      return res.json(clickReply(body, -8, 'Internal error'))
    }
  },

  async clickComplete(req, res) {
    const body = req.body
    try {
      if (!verifyClickSignature(body, 1)) {
        return res.json(clickReply(body, -1, 'Sign check failed'))
      }
      const payment = await SignupPayment.findById(body.merchant_prepare_id)
      if (
        !payment ||
        payment.provider !== 'CLICK' ||
        payment.merchantTransactionId !== body.merchant_trans_id
      ) {
        return res.json(clickReply(body, -5, 'Order not found'))
      }
      if (Number(payment.amount) !== Number(body.amount))
        return res.json(clickReply(body, -2, 'Incorrect amount'))
      if (Number(body.error) !== 0) {
        payment.paymentStatus = 'FAILED'
        await payment.save()
        return res.json(clickReply(body, Number(body.error) || -8, 'Payment failed'))
      }
      payment.providerTransactionId = String(body.click_trans_id)
      payment.paidAt = new Date()
      await payment.save()
      const activated = await activatePaidSignup(payment)
      if (activated.paymentStatus !== 'PAID')
        return res.json(clickReply(body, -8, 'Activation failed'))
      return res.json(
        clickReply(body, 0, 'Success', { merchant_confirm_id: payment._id.toString() })
      )
    } catch {
      return res.json(clickReply(body, -8, 'Internal error'))
    }
  },

  async payme(req, res) {
    const { method, params = {}, id } = req.body || {}
    const fail = (code, uz) => res.status(200).json({ error: { code, message: { uz } }, id })
    if (!verifyPaymeAuthorization(req.headers.authorization))
      return fail(-32504, 'Ruxsat berilmagan')

    try {
      const paymentId = params.account?.order_id
      const payment = paymentId ? await SignupPayment.findById(paymentId) : null
      if (!payment || payment.provider !== 'PAYME') return fail(-31050, 'Buyurtma topilmadi')

      if (method === 'CheckPerformTransaction') {
        if (payment.paymentStatus !== 'PENDING' || payment.expiresAt <= new Date())
          return fail(-31008, 'Buyurtma muddati tugagan')
        if (Number(params.amount) !== payment.amount * 100) return fail(-31001, 'Summa noto‘g‘ri')
        return res.json({ result: { allow: true }, id })
      }

      if (method === 'CreateTransaction') {
        if (payment.paymentStatus !== 'PENDING' || payment.expiresAt <= new Date()) {
          return fail(-31008, 'Buyurtma muddati tugagan')
        }
        if (Number(params.amount) !== payment.amount * 100) return fail(-31001, 'Summa noto‘g‘ri')
        if (payment.providerTransactionId && payment.providerTransactionId !== String(params.id)) {
          return fail(-31099, 'Buyurtma boshqa tranzaksiyaga biriktirilgan')
        }
        payment.providerTransactionId = String(params.id)
        await payment.save()
        return res.json({
          result: {
            create_time: payment.createdAt.getTime(),
            transaction: payment._id.toString(),
            state: 1,
          },
          id,
        })
      }

      if (method === 'PerformTransaction') {
        if (payment.providerTransactionId !== String(params.id))
          return fail(-31003, 'Tranzaksiya topilmadi')
        payment.paidAt = new Date()
        await payment.save()
        const activated = await activatePaidSignup(payment)
        if (activated.paymentStatus !== 'PAID')
          return fail(-31008, 'To‘lovni faollashtirib bo‘lmadi')
        return res.json({
          result: {
            perform_time: activated.paidAt.getTime(),
            transaction: payment._id.toString(),
            state: 2,
          },
          id,
        })
      }

      if (method === 'CheckTransaction') {
        if (payment.providerTransactionId !== String(params.id))
          return fail(-31003, 'Tranzaksiya topilmadi')
        return res.json({
          result: {
            create_time: payment.createdAt.getTime(),
            perform_time: payment.paidAt?.getTime() || 0,
            cancel_time: payment.paymentStatus === 'FAILED' ? payment.updatedAt.getTime() : 0,
            transaction: payment._id.toString(),
            state:
              payment.paymentStatus === 'PAID' ? 2 : payment.paymentStatus === 'FAILED' ? -1 : 1,
            reason: payment.paymentStatus === 'FAILED' ? 4 : null,
          },
          id,
        })
      }

      if (method === 'CancelTransaction') {
        if (payment.providerTransactionId !== String(params.id))
          return fail(-31003, 'Tranzaksiya topilmadi')
        if (payment.paymentStatus !== 'PAID') {
          payment.paymentStatus = 'FAILED'
          await payment.save()
        }
        return res.json({
          result: { cancel_time: Date.now(), transaction: payment._id.toString(), state: -1 },
          id,
        })
      }

      return fail(-32601, 'Metod topilmadi')
    } catch {
      return fail(-32400, 'Ichki xatolik')
    }
  },
}
