import {
  Customer,
  InspectionReport,
  MessageLog,
  Reminder,
  ServiceRecord,
  Transaction,
  Vehicle,
} from '../../models/index.js'
import { emitTenantEvent } from '../../realtime/socket.js'
import { isValidImageDataUrl } from '../../utils/imageData.js'
import { normalizePhoneE164 } from '../reminders/engine.js'
import { TelegramService } from '../telegram/telegramService.js'

export const buildCustomerUpdates = (body = {}) => {
  const updates = {}
  for (const field of ['fullName', 'email', 'preferredLocale', 'customerType']) {
    if (!Object.hasOwn(body, field)) continue
    updates[field] = typeof body[field] === 'string' ? body[field].trim() : body[field]
  }

  if (Object.hasOwn(body, 'phone') || Object.hasOwn(body, 'phoneE164')) {
    const phone = body.phone ?? body.phoneE164
    updates.phoneE164 = normalizePhoneE164(phone == null ? '' : String(phone))
  }

  if (typeof body.smsConsent === 'boolean') {
    updates.smsConsentAt = body.smsConsent ? new Date() : null
    updates.smsConsentSource = body.smsConsent ? 'OPERATOR_RECORDED' : null
    updates.optedOutAt = body.smsConsent ? null : new Date()
  }
  if (Object.hasOwn(body, 'photoUrl')) {
    updates.photoUrl =
      body.photoUrl === '' ? '' : isValidImageDataUrl(body.photoUrl) ? body.photoUrl : undefined
  }

  return updates
}

export const getCustomers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20))
    const skip = (page - 1) * limit
    const { search } = req.query

    const filter = { organizationId: req.organizationId }
    if (search && search.trim()) {
      const q = search.trim()
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { phoneE164: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ]
    }

    const [total, customers] = await Promise.all([
      Customer.countDocuments(filter),
      Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ])

    res.json({
      success: true,
      data: customers,
      total,
      page,
      limit,
    })
  } catch (err) {
    next(err)
  }
}

export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    })

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Mijoz topilmadi',
      })
    }

    res.json({
      success: true,
      data: customer,
    })
  } catch (err) {
    next(err)
  }
}

export const getCustomerProfile = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    })

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Mijoz topilmadi' })
    }

    const customerId = customer._id.toString()
    const [vehicles, services, inspections, transactions, reminders, messages] = await Promise.all([
      Vehicle.find({ organizationId: req.organizationId, customerId }).sort({ createdAt: -1 }),
      ServiceRecord.find({ organizationId: req.organizationId, customerId }).sort({
        serviceDate: -1,
        createdAt: -1,
      }),
      InspectionReport.find({ organizationId: req.organizationId, customerId }).sort({
        inspectedAt: -1,
      }),
      Transaction.find({ organizationId: req.organizationId, customerId }).sort({ createdAt: -1 }),
      Reminder.find({ organizationId: req.organizationId, customerId }).sort({ dueAt: -1 }),
      customer.phoneE164
        ? MessageLog.find({ organizationId: req.organizationId, phone: customer.phoneE164 })
            .sort({ sentAt: -1 })
            .limit(100)
        : [],
    ])

    return res.json({
      success: true,
      data: { customer, vehicles, services, inspections, transactions, reminders, messages },
    })
  } catch (err) {
    return next(err)
  }
}

export const createCustomer = async (req, res, next) => {
  try {
    const {
      fullName,
      phone,
      email,
      photoUrl,
      smsConsent = false,
      preferredLocale = 'uz',
      customerType = 'REGULAR',
    } = req.body
    const isWalkIn = customerType === 'WALK_IN'
    const rawPhone = phone || req.body.phoneE164

    if (!fullName) {
      return res.status(400).json({
        success: false,
        error: 'Ism kiritilishi shart',
      })
    }
    if (photoUrl && !isValidImageDataUrl(photoUrl)) {
      return res.status(400).json({
        success: false,
        error: 'Mijoz rasmi JPEG, PNG yoki WebP bo‘lishi va hajmi 1.5 MB dan oshmasligi kerak.',
      })
    }
    if (!isWalkIn && !rawPhone) {
      return res.status(400).json({
        success: false,
        error: 'Doimiy mijoz uchun telefon raqami shart',
      })
    }

    const phoneE164 = rawPhone ? normalizePhoneE164(rawPhone) : `WALKIN-${Date.now()}`

    if (!isWalkIn && rawPhone) {
      const existing = await Customer.findOne({
        organizationId: req.organizationId,
        phoneE164,
        customerType: { $ne: 'WALK_IN' },
      })
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Bu telefon raqam bilan mijoz allaqachon mavjud. Faqat shu profil ishlatiladi.',
          data: existing,
        })
      }
    }

    const newCustomer = await Customer.create({
      organizationId: req.organizationId,
      fullName: fullName.trim(),
      phoneE164,
      email: email ? email.trim() : undefined,
      photoUrl: photoUrl || undefined,
      preferredLocale,
      customerType: isWalkIn ? 'WALK_IN' : 'REGULAR',
      smsConsentAt: !isWalkIn && smsConsent === true ? new Date() : undefined,
      smsConsentSource: !isWalkIn && smsConsent === true ? 'OPERATOR_RECORDED' : undefined,
    })
    res.locals.auditEntityId = newCustomer._id.toString()

    emitTenantEvent(req.organizationId, 'customer:created', newCustomer)
    await TelegramService.notifyOwner(req.organizationId, 'newCustomer', {
      customerName: newCustomer.fullName,
      customerPhone: newCustomer.phoneE164,
    })

    res.status(201).json({
      success: true,
      data: newCustomer,
    })
  } catch (err) {
    next(err)
  }
}

export const updateCustomer = async (req, res, next) => {
  try {
    if (
      Object.hasOwn(req.body, 'photoUrl') &&
      req.body.photoUrl !== '' &&
      !isValidImageDataUrl(req.body.photoUrl)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Mijoz rasmi JPEG, PNG yoki WebP bo‘lishi va hajmi 1.5 MB dan oshmasligi kerak.',
      })
    }
    const updates = buildCustomerUpdates(req.body)
    if (Object.hasOwn(req.body, 'fullName') && !updates.fullName) {
      return res.status(400).json({ success: false, error: 'Ism bo‘sh bo‘lmasligi kerak' })
    }
    if (
      updates.customerType !== undefined &&
      !['REGULAR', 'WALK_IN'].includes(updates.customerType)
    ) {
      return res.status(400).json({ success: false, error: 'Mijoz turi noto‘g‘ri' })
    }

    if (updates.phoneE164) {
      const duplicate = await Customer.findOne({
        organizationId: req.organizationId,
        phoneE164: updates.phoneE164,
        customerType: { $ne: 'WALK_IN' },
        _id: { $ne: req.params.id },
      })
      if (duplicate) {
        return res
          .status(409)
          .json({ success: false, error: 'Bu telefon raqam boshqa mijozga tegishli' })
      }
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { $set: updates },
      { new: true, runValidators: true }
    )

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Mijoz topilmadi',
      })
    }

    emitTenantEvent(req.organizationId, 'customer:updated', customer)

    res.json({
      success: true,
      data: customer,
    })
  } catch (err) {
    next(err)
  }
}

export const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId,
    })

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Mijoz topilmadi',
      })
    }

    emitTenantEvent(req.organizationId, 'customer:deleted', { id: req.params.id })

    res.json({
      success: true,
      message: 'Mijoz o‘chirildi',
    })
  } catch (err) {
    next(err)
  }
}
