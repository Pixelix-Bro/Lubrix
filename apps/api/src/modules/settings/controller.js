import {
  AuditLog,
  AuthSession,
  CameraSetting,
  Organization,
  PaymentCard,
  ProductCategory,
  User,
} from '../../models/index.js'
import { buildAuditQuery } from './auditQuery.js'

const ORGANIZATION_SETTINGS_FIELDS = [
  'name',
  'countryCode',
  'timezone',
  'currency',
  'defaultLocale',
  'phone',
  'email',
  'address',
  'logoUrl',
]
const SETTINGS_FIELDS = [
  'smsSender',
  'smsProvider',
  'autoReminders',
  'workingDays',
  'tableDensity',
  'lowStockThreshold',
]

export const buildSettingsUpdate = ({ organization, settings } = {}) => {
  const updateData = {}

  if (organization && typeof organization === 'object' && !Array.isArray(organization)) {
    for (const field of ORGANIZATION_SETTINGS_FIELDS) {
      if (Object.hasOwn(organization, field)) {
        updateData[field] =
          typeof organization[field] === 'string' ? organization[field].trim() : organization[field]
      }
    }
  }

  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    for (const field of SETTINGS_FIELDS) {
      if (Object.hasOwn(settings, field)) updateData[`settings.${field}`] = settings[field]
    }

    if (settings.smsTemplates && typeof settings.smsTemplates === 'object') {
      for (const template of ['dueSoon', 'overdue']) {
        if (Object.hasOwn(settings.smsTemplates, template)) {
          updateData[`settings.smsTemplates.${template}`] = settings.smsTemplates[template]
        }
      }
    }
  }

  return updateData
}

export const SettingsController = {
  // 1. Get General Settings
  async getSettings(req, res, next) {
    try {
      const org = await Organization.findById(req.organizationId)
      if (!org) {
        return res.status(404).json({
          success: false,
          error: 'Tashkilot topilmadi. Hisob tashkilotiga kirishni tekshiring.',
        })
      }
      res.json({
        success: true,
        data: {
          organization: org,
          settings: org.settings || {},
        },
      })
    } catch (err) {
      next(err)
    }
  },

  // 2. Update General Settings
  async updateSettings(req, res, next) {
    try {
      const { organization } = req.body
      const updateData = buildSettingsUpdate(req.body)
      if (Object.hasOwn(organization || {}, 'name') && !updateData.name) {
        return res
          .status(400)
          .json({ success: false, error: 'Tashkilot nomi bo‘sh bo‘lmasligi kerak' })
      }

      const updated = await Organization.findByIdAndUpdate(
        req.organizationId,
        { $set: updateData },
        { returnDocument: 'after', runValidators: true }
      )
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Tashkilot topilmadi. Hisob tashkilotiga kirishni tekshiring.',
        })
      }

      // Audit Log
      await AuditLog.create({
        organizationId: req.organizationId,
        userId: req.userId,
        userName: req.user?.name,
        action: 'UPDATE',
        entity: 'SETTINGS',
        details: 'Tizim va kompaniya sozlamalari yangilandi',
      })

      res.json({ success: true, data: { organization: updated, settings: updated.settings } })
    } catch (err) {
      next(err)
    }
  },

  // 3. User Profile & Avatar Upload
  async updateProfile(req, res, next) {
    try {
      const { name, phone, avatarUrl, currentPassword, newPassword } = req.body
      const user = await User.findById(req.userId)
      if (!user) {
        return res.status(404).json({ success: false, error: 'Foydalanuvchi topilmadi' })
      }

      if (name) user.name = name
      if (phone) user.phone = phone
      if (avatarUrl !== undefined) user.avatarUrl = avatarUrl

      let passwordChanged = false
      if (newPassword) {
        const bcrypt = await import('bcryptjs')
        if (!currentPassword) {
          return res.status(400).json({ success: false, error: 'Joriy parolni kiriting' })
        }
        const isMatch = await bcrypt.default.compare(currentPassword, user.passwordHash)
        if (!isMatch) {
          return res.status(400).json({ success: false, error: 'Joriy parol noto‘g‘ri' })
        }
        if (String(newPassword).length < 8) {
          return res
            .status(400)
            .json({ success: false, error: 'Yangi parol kamida 8 belgidan iborat bo‘lishi kerak' })
        }
        user.passwordHash = await bcrypt.default.hash(newPassword, 12)
        passwordChanged = true
      }

      await user.save()
      if (passwordChanged) {
        await AuthSession.updateMany(
          { userId: req.userId, _id: { $ne: req.authSession?._id }, revokedAt: null },
          { $set: { revokedAt: new Date() } }
        )
      }

      res.json({
        success: true,
        message: 'Profil muvaffaqiyatli yangilandi',
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  // 4. Payment Cards / Terminal (ONLY OWNER CAN ADD/MANAGE)
  async getPaymentCards(req, res, next) {
    try {
      const cards = await PaymentCard.find({ organizationId: req.organizationId })
      res.json({ success: true, data: cards })
    } catch (err) {
      next(err)
    }
  },

  async addPaymentCard(req, res, next) {
    try {
      // STRICT CHECK: Only OWNER can link business payment card / terminal
      if (req.role !== 'OWNER') {
        return res.status(403).json({
          success: false,
          error: 'Faqatgina tashkilot mulkdori (OWNER) to‘lov kartalarini qo‘shishi mumkin!',
        })
      }

      const {
        cardHolder,
        cardNumber,
        cardType,
        expiry,
        expiryMonth,
        expiryYear,
        bankName,
        terminalId,
        isDefault,
      } = req.body
      const cleanExpiry =
        expiry || (expiryMonth && expiryYear ? `${expiryMonth}/${expiryYear}` : '')
      if (!cardHolder || !cardNumber || !cleanExpiry) {
        return res
          .status(400)
          .json({ success: false, error: 'Karta egasi, raqami va amal qilish muddati shart' })
      }

      // Mask the card number for security (never store raw full card in plain)
      const cleanNum = cardNumber.replace(/\s+/g, '')
      const masked = `${cleanNum.slice(0, 4)} **** **** ${cleanNum.slice(-4)}`

      if (isDefault) {
        await PaymentCard.updateMany({ organizationId: req.organizationId }, { isDefault: false })
      }

      const newCard = await PaymentCard.create({
        organizationId: req.organizationId,
        cardHolder: cardHolder.toUpperCase(),
        cardNumberMasked: masked,
        cardType: cardType || (cleanNum.startsWith('8600') ? 'UZCARD' : 'HUMO'),
        expiry: cleanExpiry,
        bankName: bankName || 'O‘zbekiston Banki',
        terminalId: terminalId || null,
        isDefault: !!isDefault,
        addedByUserId: req.userId,
      })

      await AuditLog.create({
        organizationId: req.organizationId,
        userId: req.userId,
        userName: req.user?.name,
        action: 'CREATE',
        entity: 'PAYMENT_CARD',
        entityId: newCard._id,
        details: `Yangi to‘lov kartasi ulandi: ${masked}`,
      })

      res.status(201).json({ success: true, data: newCard })
    } catch (err) {
      next(err)
    }
  },

  async updatePaymentCard(req, res, next) {
    try {
      if (req.role !== 'OWNER') {
        return res.status(403).json({
          success: false,
          error: 'Faqatgina tashkilot mulkdori kartani tahrirlashi mumkin',
        })
      }
      const { cardHolder, cardType, expiry, bankName, terminalId, isDefault } = req.body
      const updates = {}
      if (cardHolder) updates.cardHolder = cardHolder.toUpperCase()
      if (cardType) updates.cardType = cardType
      if (expiry) updates.expiry = expiry
      if (bankName !== undefined) updates.bankName = bankName
      if (terminalId !== undefined) updates.terminalId = terminalId
      if (isDefault) {
        await PaymentCard.updateMany({ organizationId: req.organizationId }, { isDefault: false })
        updates.isDefault = true
      }
      const card = await PaymentCard.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.organizationId },
        { $set: updates },
        { new: true }
      )
      if (!card) return res.status(404).json({ success: false, error: 'Karta topilmadi' })
      res.json({ success: true, data: card })
    } catch (err) {
      next(err)
    }
  },

  async deletePaymentCard(req, res, next) {
    try {
      if (req.role !== 'OWNER') {
        return res.status(403).json({
          success: false,
          error: 'Faqatgina tashkilot mulkdori (OWNER) kartani o‘chira oladi!',
        })
      }
      const { id } = req.params
      await PaymentCard.findOneAndDelete({ _id: id, organizationId: req.organizationId })
      res.json({ success: true, message: 'Karta muvaffaqiyatli o‘chirildi' })
    } catch (err) {
      next(err)
    }
  },

  // 5. Camera & Service Lane ANPR Settings
  async getCameraSettings(req, res, next) {
    try {
      const settings = await CameraSetting.find({ organizationId: req.organizationId })
      res.json({ success: true, data: settings })
    } catch (err) {
      next(err)
    }
  },

  async saveCameraSetting(req, res, next) {
    try {
      const { branchId, cameraName, name, streamUrl, autoANPR, actionOnDetect, minConfidence, id } =
        req.body
      const finalCameraName = cameraName || name || '1-Yo‘lak Kamerasi'

      let cam
      if (id) {
        cam = await CameraSetting.findOneAndUpdate(
          { _id: id, organizationId: req.organizationId },
          {
            branchId,
            cameraName: finalCameraName,
            streamUrl,
            autoANPR,
            actionOnDetect,
            minConfidence,
          },
          { new: true }
        )
      } else {
        cam = await CameraSetting.create({
          organizationId: req.organizationId,
          branchId: branchId || 'br-01',
          cameraName: finalCameraName,
          streamUrl,
          autoANPR: autoANPR !== undefined ? autoANPR : true,
          actionOnDetect: actionOnDetect || 'OPEN_SERVICE',
          minConfidence: minConfidence || 85,
        })
      }

      res.json({ success: true, data: cam })
    } catch (err) {
      next(err)
    }
  },

  // 6. Audit Logs
  async getAuditLogs(req, res, next) {
    try {
      const query = buildAuditQuery(req.query)
      if (query.error) return res.status(400).json({ success: false, error: query.error })

      const filter = {
        organizationId: req.organizationId,
        ...query.filter,
        path: { $not: /\/settings\/profile(?:\?|$)/ },
      }
      const [total, logs] = await Promise.all([
        AuditLog.countDocuments(filter),
        AuditLog.find(filter).sort({ createdAt: -1 }).skip(query.skip).limit(query.limit),
      ])

      res.json({
        success: true,
        data: logs,
        total,
        page: query.page,
        limit: query.limit,
        pages: Math.ceil(total / query.limit),
      })
    } catch (err) {
      next(err)
    }
  },

  // 7. Categories CRUD
  async getCategories(req, res, next) {
    try {
      const categories = await ProductCategory.find({ organizationId: req.organizationId })
      res.json({ success: true, data: categories })
    } catch (err) {
      next(err)
    }
  },

  async createCategory(req, res, next) {
    try {
      const { name, description } = req.body
      if (!name)
        return res.status(400).json({ success: false, error: 'Kategoriya nomi kiritilmadi' })
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const cat = await ProductCategory.create({
        organizationId: req.organizationId,
        name,
        slug,
        description,
      })
      res.status(201).json({ success: true, data: cat })
    } catch (err) {
      next(err)
    }
  },

  async updateCategory(req, res, next) {
    try {
      const { name, description } = req.body
      if (!name) return res.status(400).json({ success: false, error: 'Kategoriya nomi shart' })
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const cat = await ProductCategory.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.organizationId },
        { $set: { name, slug, description } },
        { new: true }
      )
      if (!cat) return res.status(404).json({ success: false, error: 'Toifa topilmadi' })
      res.json({ success: true, data: cat })
    } catch (err) {
      next(err)
    }
  },

  async deleteCategory(req, res, next) {
    try {
      const { id } = req.params
      await ProductCategory.findOneAndDelete({ _id: id, organizationId: req.organizationId })
      res.json({ success: true, message: 'Kategoriya o‘chirildi' })
    } catch (err) {
      next(err)
    }
  },
}
