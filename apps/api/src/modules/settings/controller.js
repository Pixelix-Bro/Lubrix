import {
  AuditLog,
  CameraSetting,
  Organization,
  PaymentCard,
  ProductCategory,
  User,
} from '../../models/index.js'

export const SettingsController = {
  // 1. Get General Settings
  async getSettings(req, res, next) {
    try {
      const org = await Organization.findById(req.organizationId)
      res.json({
        success: true,
        data: {
          organization: org,
          settings: org?.settings || {},
        },
      })
    } catch (err) {
      next(err)
    }
  },

  // 2. Update General Settings
  async updateSettings(req, res, next) {
    try {
      const { organization, settings } = req.body
      const updateData = {}

      if (organization) {
        if (organization.name) updateData.name = organization.name
        if (organization.countryCode) updateData.countryCode = organization.countryCode
        if (organization.timezone) updateData.timezone = organization.timezone
        if (organization.currency) updateData.currency = organization.currency
        if (organization.defaultLocale) updateData.defaultLocale = organization.defaultLocale
        if (organization.phone) updateData.phone = organization.phone
        if (organization.email) updateData.email = organization.email
        if (organization.address) updateData.address = organization.address
        if (organization.logoUrl) updateData.logoUrl = organization.logoUrl
      }

      if (settings) {
        updateData.settings = settings
      }

      const updated = await Organization.findByIdAndUpdate(
        req.organizationId,
        { $set: updateData },
        { new: true }
      )

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

      if (newPassword) {
        const bcrypt = await import('bcryptjs')
        if (!currentPassword) {
          return res.status(400).json({ success: false, error: 'Joriy parolni kiriting' })
        }
        const isMatch = await bcrypt.default.compare(currentPassword, user.passwordHash)
        if (!isMatch) {
          return res.status(400).json({ success: false, error: 'Joriy parol noto‘g‘ri' })
        }
        user.passwordHash = await bcrypt.default.hash(newPassword, 12)
      }

      await user.save()

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
      const logs = await AuditLog.find({ organizationId: req.organizationId })
        .sort({ createdAt: -1 })
        .limit(100)
      res.json({ success: true, data: logs })
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
