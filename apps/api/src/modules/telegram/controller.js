import crypto from 'crypto'
import mongoose from 'mongoose'
import multer from 'multer'
import {
  Branch,
  TelegramCommand,
  TelegramIntegration,
  TelegramMedia,
  TelegramServiceCatalogItem,
} from '../../models/index.js'
import { TelegramFlowEngine } from './flowEngine.js'
import { activateTelegramBot, stopTelegramPolling } from './runtime.js'
import { TelegramService } from './telegramService.js'

const MEDIA_TYPES = new Set(['photo', 'video', 'document', 'audio', 'voice'])
const SUPPORTED_ACTIONS = new Set([
  'command.template',
  'menu.start',
  'menu.help',
  'search.menu',
  'search.phone',
  'search.plate',
  'branches.regions',
  'branches.list',
  'branches.all',
  'branches.nearby',
  'branch.details',
  'branch.location',
  'products.list',
  'services.list',
  'services.details',
  'customer.cars',
  'customer.vehicle',
  'customer.history',
  'contact',
  'contact.request',
  'contact.type',
  'booking.start',
  'booking.vehicle',
  'booking.service',
  'booking.branches',
  'booking.branch',
  'booking.confirm',
  'booking.cancel',
  'flow.cancel',
  'flow.back',
])
const MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'application/pdf',
  'text/plain',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
])

const syncBotCommandsInBackground = (organizationId, botToken) => {
  void TelegramService.syncBotCommands(organizationId, botToken).catch((error) => {
    console.warn(
      '[LUBRIX TELEGRAM] Bot komandalar menyusi sinxronlanmadi:',
      error.code || error.message
    )
  })
}

const hasValidCoordinates = (latitude, longitude) =>
  latitude !== undefined &&
  latitude !== null &&
  latitude !== '' &&
  longitude !== undefined &&
  longitude !== null &&
  longitude !== '' &&
  Number.isFinite(Number(latitude)) &&
  Number(latitude) >= -90 &&
  Number(latitude) <= 90 &&
  Number.isFinite(Number(longitude)) &&
  Number(longitude) >= -180 &&
  Number(longitude) <= 180

export const telegramMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!MEDIA_MIME_TYPES.has(file.mimetype)) {
      return callback(new Error('Bu fayl turi Telegram uchun qo‘llab-quvvatlanmaydi'))
    }
    callback(null, true)
  },
}).single('media')

export function handleTelegramMediaUpload(req, res, next) {
  telegramMediaUpload(req, res, (error) => {
    if (!error) return next()
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'Media fayl 15 MB dan oshmasin'
        : error.message || 'Media faylni yuklab bo‘lmadi'
    return res.status(400).json({ success: false, error: message })
  })
}

function hasValidMediaSignature(file) {
  const { buffer, mimetype } = file
  if (mimetype === 'image/jpeg')
    return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  if (mimetype === 'image/png')
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (mimetype === 'image/webp')
    return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
  if (mimetype === 'video/mp4' || mimetype === 'audio/mp4')
    return buffer.toString('ascii', 4, 8) === 'ftyp'
  if (mimetype === 'application/pdf') return buffer.toString('ascii', 0, 5) === '%PDF-'
  if (mimetype === 'audio/ogg') return buffer.toString('ascii', 0, 4) === 'OggS'
  if (mimetype === 'audio/wav' || mimetype === 'audio/x-wav')
    return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE'
  if (mimetype === 'audio/mpeg') {
    return (
      buffer.toString('ascii', 0, 3) === 'ID3' ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    )
  }
  if (mimetype === 'text/plain') {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buffer)
      return !buffer.includes(0)
    } catch {
      return false
    }
  }
  return false
}

function isValidKeyboard(rows, inline) {
  if (!Array.isArray(rows) || rows.length > 20) return false
  return rows.every(
    (row) =>
      Array.isArray(row) &&
      row.length <= 8 &&
      row.every((button) => {
        if (
          !button ||
          typeof button.text !== 'string' ||
          !button.text.trim() ||
          button.text.length > 64
        ) {
          return false
        }
        if (!inline) return !button.action || SUPPORTED_ACTIONS.has(button.action)
        if (button.type === 'url') {
          try {
            return new URL(button.url).protocol === 'https:'
          } catch {
            return false
          }
        }
        if (button.type === 'web_app') {
          try {
            const configuredOrigin = process.env.TELEGRAM_WEBAPP_URL
              ? new URL(process.env.TELEGRAM_WEBAPP_URL).origin
              : null
            const url = new URL(button.url)
            return Boolean(
              configuredOrigin && url.protocol === 'https:' && url.origin === configuredOrigin
            )
          } catch {
            return false
          }
        }
        return (!button.type || button.type === 'callback') && SUPPORTED_ACTIONS.has(button.action)
      })
  )
}

function isValidTelegramConfiguration(configuration) {
  if (configuration.action && !SUPPORTED_ACTIONS.has(configuration.action)) return false
  if (
    configuration.parseMode &&
    !['HTML', 'Markdown', 'MarkdownV2'].includes(configuration.parseMode)
  ) {
    return false
  }
  if (configuration.inlineKeyboard && !isValidKeyboard(configuration.inlineKeyboard, true))
    return false
  if (
    configuration.replyKeyboard &&
    !isValidKeyboard(configuration.replyKeyboard.rows || [], false)
  ) {
    return false
  }
  if (
    configuration.contactLocationType !== undefined &&
    !['contact', 'location'].includes(configuration.contactLocationType)
  )
    return false
  if (
    configuration.contactLocationType === 'location' &&
    !hasValidCoordinates(configuration.latitude, configuration.longitude)
  )
    return false
  if (
    configuration.contactLocationType === 'contact' &&
    (!String(configuration.contactPhone || '').trim() ||
      !String(configuration.contactName || '').trim())
  )
    return false
  if (configuration.messages !== undefined) {
    if (!Array.isArray(configuration.messages) || configuration.messages.length > 20) return false
    if (!configuration.messages.length) return false
    if (
      !configuration.messages.every(
        (message) =>
          message &&
          typeof message === 'object' &&
          [
            'Reply Message',
            'Inline Message',
            'Photo Message',
            'Text Message',
            'Video Message',
            'Document Message',
            'Audio / Voice Message',
            'Contact / Location',
          ].includes(message.type) &&
          String(message.text || message.caption || '').length <= 4096 &&
          String(message.media || '').length <= 256 &&
          (message.contactLocationType === undefined ||
            ['contact', 'location'].includes(message.contactLocationType)) &&
          (![
            'Photo Message',
            'Video Message',
            'Document Message',
            'Audio / Voice Message',
          ].includes(message.type) ||
            Boolean(message.media)) &&
          (!message.inlineKeyboard || isValidKeyboard(message.inlineKeyboard, true)) &&
          (message.type !== 'Contact / Location' ||
            (message.contactLocationType === 'location'
              ? hasValidCoordinates(message.latitude, message.longitude)
              : message.contactLocationType === 'contact' &&
                String(message.contactPhone || '').trim() &&
                String(message.contactName || '').trim())) &&
          (!message.parseMode || ['HTML', 'Markdown', 'MarkdownV2'].includes(message.parseMode))
      )
    )
      return false
  }
  return true
}

export const TelegramController = {
  // 1. Get Integration Status
  async getStatus(req, res, next) {
    try {
      const integration = await TelegramIntegration.findOne({ organizationId: req.organizationId })
      if (!integration) {
        return res.json({
          success: true,
          data: {
            isConnected: false,
            botUsername: null,
            botName: null,
            isActive: false,
          },
        })
      }

      // Never expose full token to frontend, mask it
      const maskedToken = integration.botToken
        ? `${integration.botToken.slice(0, 6)}...${integration.botToken.slice(-4)}`
        : null

      res.json({
        success: true,
        data: {
          isConnected: integration.isActive,
          botUsername: integration.botUsername,
          botName: integration.botName,
          botId: integration.botId,
          botTokenMasked: maskedToken,
          isActive: integration.isActive,
          ownerTelegramChatId: integration.ownerTelegramChatId,
          welcomeMessage: integration.welcomeMessage,
          welcomeMediaId: integration.welcomeMediaId,
          notifications: integration.notifications,
          lastSyncedAt: integration.lastSyncedAt,
          lastError: integration.lastError,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  // 2. Verify Bot Token
  async verifyToken(req, res, next) {
    try {
      const { botToken } = req.body
      if (!botToken) {
        return res.status(400).json({ success: false, error: 'Bot token kiritilishi shart' })
      }

      const verifyRes = await TelegramService.verifyBotToken(botToken.trim())
      if (!verifyRes.valid) {
        return res.status(400).json({ success: false, error: verifyRes.error })
      }

      res.json({
        success: true,
        data: {
          botId: verifyRes.bot.id,
          botName: verifyRes.bot.first_name,
          botUsername: verifyRes.bot.username,
          username: verifyRes.bot.username,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  // 3. Save & Activate Bot Integration
  async saveIntegration(req, res, next) {
    try {
      const { botToken, ownerTelegramChatId, welcomeMessage, welcomeMediaId, notifications } =
        req.body
      const existing = await TelegramIntegration.findOne({ organizationId: req.organizationId })
      const tokenToSave = String(botToken || existing?.botToken || '').trim()
      if (!tokenToSave) {
        return res.status(400).json({ success: false, error: 'Bot token kiritilishi shart' })
      }

      const verifyRes = await TelegramService.verifyBotToken(tokenToSave)
      if (!verifyRes.valid) {
        return res.status(400).json({ success: false, error: verifyRes.error })
      }

      const webhookSecret = crypto.randomBytes(16).toString('hex')

      const integration = await TelegramIntegration.findOneAndUpdate(
        { organizationId: req.organizationId },
        {
          organizationId: req.organizationId,
          botToken: tokenToSave,
          botId: String(verifyRes.bot.id),
          botName: verifyRes.bot.first_name,
          botUsername: verifyRes.bot.username,
          webhookSecret,
          isActive: true,
          ownerTelegramChatId: ownerTelegramChatId || null,
          welcomeMessage: welcomeMessage || undefined,
          welcomeMediaId: Object.hasOwn(req.body, 'welcomeMediaId')
            ? welcomeMediaId || null
            : existing?.welcomeMediaId || null,
          notifications: notifications || undefined,
          lastSyncedAt: new Date(),
          lastError: null,
        },
        { upsert: true, new: true }
      )

      await TelegramService.ensureDefaultCommands(req.organizationId)
      await activateTelegramBot(integration)

      res.json({
        success: true,
        message: 'Telegram bot muvaffaqiyatli ulandi va serverda ishga tushirildi',
        data: {
          botUsername: integration.botUsername,
          botName: integration.botName,
          isActive: true,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  // 4. Disconnect Bot
  async disconnect(req, res, next) {
    try {
      await stopTelegramPolling(req.organizationId)
      const integration = await TelegramIntegration.findOneAndUpdate(
        { organizationId: req.organizationId },
        { isActive: false },
        { new: true }
      )
      if (integration?.botToken) {
        await TelegramService.deleteWebhook(integration.botToken).catch(() => {})
      }
      res.json({ success: true, message: 'Telegram bot uzildi' })
    } catch (err) {
      next(err)
    }
  },

  // 5. Send Test Message
  async sendTestMessage(req, res, next) {
    try {
      const { chatId } = req.body
      const integration = await TelegramIntegration.findOne({ organizationId: req.organizationId })
      if (!integration || !integration.botToken) {
        return res.status(400).json({ success: false, error: 'Avval Telegram botni ulang' })
      }

      const targetChat = chatId || integration.ownerTelegramChatId
      if (!targetChat) {
        return res.status(400).json({ success: false, error: 'Qabul qiluvchi Chat ID kiritilmadi' })
      }

      await TelegramService.sendMessage({
        botToken: integration.botToken,
        chatId: targetChat,
        text: '<b>Lubrix CRM:</b> Tabriklaymiz! Sizning Telegram botingiz muvaffaqiyatli sinovdan o‘tdi va faol holatda.',
      })

      res.json({ success: true, message: 'Test xabari Telegram orqali yuborildi!' })
    } catch (err) {
      next(err)
    }
  },

  async sendTestCommand(req, res, next) {
    try {
      if (!mongoose.isValidObjectId(req.body.id)) {
        return res.status(400).json({ success: false, error: 'Komanda identifikatori noto‘g‘ri' })
      }
      const [integration, command] = await Promise.all([
        TelegramIntegration.findOne({ organizationId: req.organizationId, isActive: true }),
        TelegramCommand.findOne({ _id: req.body.id, organizationId: req.organizationId }),
      ])
      if (!integration?.ownerTelegramChatId) {
        return res
          .status(400)
          .json({ success: false, error: 'Test uchun bot va admin Chat ID kerak' })
      }
      if (!command) return res.status(404).json({ success: false, error: 'Buyruq topilmadi' })
      await TelegramFlowEngine.testCommand(
        req.organizationId,
        integration,
        command,
        integration.ownerTelegramChatId
      )
      res.json({ success: true, message: 'Komanda test xabari yuborildi' })
    } catch (err) {
      next(err)
    }
  },

  async uploadMedia(req, res, next) {
    try {
      const { file } = req
      const mediaType = String(req.body.mediaType || '')
      if (!file) return res.status(400).json({ success: false, error: 'Media fayl tanlanmadi' })
      if (!MEDIA_TYPES.has(mediaType) || !hasValidMediaSignature(file)) {
        return res.status(400).json({ success: false, error: 'Fayl turi yoki mazmuni mos emas' })
      }
      if (mediaType === 'photo' && file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'Rasm hajmi 10 MB dan oshmasin' })
      }
      if (
        (mediaType === 'photo' && !file.mimetype.startsWith('image/')) ||
        (mediaType === 'video' && file.mimetype !== 'video/mp4') ||
        ((mediaType === 'audio' || mediaType === 'voice') && !file.mimetype.startsWith('audio/'))
      ) {
        return res
          .status(400)
          .json({ success: false, error: 'Media turi tanlangan xabar turiga mos emas' })
      }
      const integration = await TelegramIntegration.findOne({
        organizationId: req.organizationId,
        isActive: true,
      }).select('botId')
      if (!integration?.botId) {
        return res.status(400).json({ success: false, error: 'Avval Telegram botni ulang' })
      }
      const media = await TelegramMedia.create({
        organizationId: req.organizationId,
        botId: integration.botId,
        fileName: file.originalname.slice(0, 180),
        mimeType: file.mimetype,
        mediaType,
        size: file.size,
        data: file.buffer,
      })
      res.status(201).json({
        success: true,
        data: {
          id: media._id.toString(),
          media: `media:${media._id}`,
          fileName: media.fileName,
          size: media.size,
          mediaType,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  async getMedia(req, res, next) {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, error: 'Media identifikatori noto‘g‘ri' })
      }
      const integration = await TelegramIntegration.findOne({
        organizationId: req.organizationId,
      }).select('botId')
      if (!integration?.botId)
        return res.status(404).json({ success: false, error: 'Media topilmadi' })
      const media = await TelegramMedia.findOne({
        _id: req.params.id,
        organizationId: req.organizationId,
        botId: String(integration.botId),
      }).select('+data')
      if (!media) return res.status(404).json({ success: false, error: 'Media topilmadi' })
      res.set({
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Type': media.mimeType,
        'Content-Length': String(media.size),
        'Content-Disposition': `inline; filename="${media.fileName.replace(/["\\\r\n]/g, '_')}"`,
      })
      res.send(media.data)
    } catch (err) {
      next(err)
    }
  },

  async listServices(req, res, next) {
    try {
      const services = await TelegramServiceCatalogItem.find({
        organizationId: req.organizationId,
      }).sort({ name: 1 })
      res.json({ success: true, data: services })
    } catch (err) {
      next(err)
    }
  },

  async saveService(req, res, next) {
    try {
      const { id, name, description, price, currency, durationMinutes, branchIds, isActive } =
        req.body
      if (id && !mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, error: 'Xizmat identifikatori noto‘g‘ri' })
      }
      const normalizedName = String(name || '').trim()
      const normalizedDescription = String(description || '').trim()
      const normalizedPrice =
        price === '' || price === null || price === undefined ? undefined : Number(price)
      const normalizedDuration =
        durationMinutes === '' || durationMinutes === null || durationMinutes === undefined
          ? undefined
          : Number(durationMinutes)
      const normalizedBranchIds = Array.isArray(branchIds)
        ? [...new Set(branchIds.map(String))]
        : []
      if (
        !normalizedName ||
        normalizedName.length > 100 ||
        normalizedDescription.length > 500 ||
        (normalizedPrice !== undefined &&
          (!Number.isFinite(normalizedPrice) || normalizedPrice < 0)) ||
        (normalizedDuration !== undefined &&
          (!Number.isInteger(normalizedDuration) ||
            normalizedDuration < 1 ||
            normalizedDuration > 1440)) ||
        String(currency || 'UZS').trim().length > 8
      ) {
        return res.status(400).json({ success: false, error: 'Xizmat maydonlari noto‘g‘ri' })
      }
      if (normalizedBranchIds.length) {
        const validBranches = await Branch.countDocuments({
          organizationId: req.organizationId,
          isActive: true,
          _id: { $in: normalizedBranchIds },
        })
        if (validBranches !== normalizedBranchIds.length) {
          return res
            .status(400)
            .json({ success: false, error: 'Filiallardan biri faol emas yoki topilmadi' })
        }
      }
      const duplicate = await TelegramServiceCatalogItem.findOne({
        organizationId: req.organizationId,
        name: normalizedName,
        ...(id ? { _id: { $ne: id } } : {}),
      })
      if (duplicate) return res.status(409).json({ success: false, error: 'Bu xizmat nomi mavjud' })
      const normalizedCurrency =
        String(currency || '')
          .trim()
          .toUpperCase() || 'UZS'
      const updates = {
        name: normalizedName,
        description: normalizedDescription,
        price: normalizedPrice ?? null,
        currency: normalizedCurrency,
        durationMinutes: normalizedDuration ?? null,
        branchIds: normalizedBranchIds,
        isActive: isActive !== false,
      }
      const service = id
        ? await TelegramServiceCatalogItem.findOneAndUpdate(
            { _id: id, organizationId: req.organizationId },
            { $set: updates },
            { new: true, runValidators: true }
          )
        : await TelegramServiceCatalogItem.create({
            organizationId: req.organizationId,
            ...updates,
          })
      if (!service) return res.status(404).json({ success: false, error: 'Xizmat topilmadi' })
      res.json({ success: true, data: service })
    } catch (err) {
      next(err)
    }
  },

  async deleteService(req, res, next) {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, error: 'Xizmat identifikatori noto‘g‘ri' })
      }
      const service = await TelegramServiceCatalogItem.findOneAndDelete({
        _id: req.params.id,
        organizationId: req.organizationId,
      })
      if (!service) return res.status(404).json({ success: false, error: 'Xizmat topilmadi' })
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  },

  async verifyWebAppInitData(req, res, next) {
    try {
      const initData = String(req.body?.initData || req.query?.initData || '')
      const integration = await TelegramIntegration.findOne({
        organizationId: req.params.orgId,
        isActive: true,
      })
      if (!integration?.botToken || !initData || initData.length > 8192) {
        return res
          .status(400)
          .json({ success: false, error: 'Telegram Web App ma’lumoti noto‘g‘ri' })
      }
      const params = new URLSearchParams(initData)
      const suppliedHash = params.get('hash') || ''
      const authDate = Number(params.get('auth_date'))
      const nowSeconds = Math.floor(Date.now() / 1000)
      if (
        !/^[a-f0-9]{64}$/i.test(suppliedHash) ||
        !Number.isFinite(authDate) ||
        authDate > nowSeconds + 60 ||
        nowSeconds - authDate > 86400
      ) {
        return res
          .status(401)
          .json({ success: false, error: 'Telegram Web App sessiyasi eskirgan' })
      }
      params.delete('hash')
      const dataCheckString = [...params.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(integration.botToken)
        .digest()
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest()
      const expectedHash = Buffer.from(suppliedHash, 'hex')
      if (
        expectedHash.length !== calculatedHash.length ||
        !crypto.timingSafeEqual(expectedHash, calculatedHash)
      ) {
        return res.status(401).json({ success: false, error: 'Telegram Web App imzosi noto‘g‘ri' })
      }
      let telegramUser
      try {
        telegramUser = JSON.parse(params.get('user') || '{}')
      } catch {
        return res
          .status(400)
          .json({ success: false, error: 'Telegram foydalanuvchi ma’lumoti noto‘g‘ri' })
      }
      if (!telegramUser.id) {
        return res.status(400).json({ success: false, error: 'Telegram foydalanuvchisi topilmadi' })
      }
      res.json({
        success: true,
        data: { telegramUserId: String(telegramUser.id), authDate },
      })
    } catch (err) {
      next(err)
    }
  },

  // 6. Public Webhook Handler
  async handleWebhook(req, res) {
    try {
      const { orgId } = req.params
      const integration = await TelegramIntegration.findOne({
        organizationId: orgId,
        isActive: true,
      })
      const expected = Buffer.from(String(integration?.webhookSecret || ''))
      const supplied = Buffer.from(String(req.headers['x-telegram-bot-api-secret-token'] || ''))
      if (
        !integration ||
        expected.length === 0 ||
        expected.length !== supplied.length ||
        !crypto.timingSafeEqual(expected, supplied)
      ) {
        return res.status(403).json({ ok: false })
      }
      const update = req.body
      await TelegramService.handleWebhookUpdate(orgId, update)
      res.json({ ok: true })
    } catch {
      res.status(500).json({ ok: false })
    }
  },

  async listCommands(req, res, next) {
    try {
      await TelegramService.ensureDefaultCommands(req.organizationId)
      const commands = await TelegramCommand.find({ organizationId: req.organizationId }).sort({
        createdAt: 1,
      })
      res.json({ success: true, data: commands })
    } catch (err) {
      next(err)
    }
  },

  async saveCommand(req, res, next) {
    try {
      const {
        id,
        command,
        title,
        description,
        responseTemplate,
        responseType,
        configuration,
        isActive = true,
      } = req.body
      if (id && !mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, error: 'Komanda identifikatori noto‘g‘ri' })
      }
      const existing = id
        ? await TelegramCommand.findOne({ _id: id, organizationId: req.organizationId })
        : null
      if (id && !existing)
        return res.status(404).json({ success: false, error: 'Buyruq topilmadi' })
      const cmd = String(command || '')
        .trim()
        .replace(/^\/*/, '/')
        .toLowerCase()
      const allowedResponseTypes = [
        'Reply Message',
        'Inline Message',
        'Photo Message',
        'Text Message',
        'Video Message',
        'Document Message',
        'Audio / Voice Message',
        'Contact / Location',
        'Multiple Messages',
        'All Features',
      ]
      const resolvedTitle = String(title ?? existing?.title ?? '').trim()
      const resolvedDescription = String(description ?? existing?.description ?? '')
      const resolvedTemplate = String(responseTemplate ?? existing?.responseTemplate ?? '')
      const resolvedResponseType = responseType || existing?.responseType || 'Text Message'
      const resolvedConfiguration = configuration ?? existing?.configuration ?? {}
      const serializedConfiguration = JSON.stringify(resolvedConfiguration)
      const hasConfiguredMessage = Boolean(
        resolvedTemplate.trim() ||
        resolvedConfiguration.media ||
        resolvedConfiguration.messages?.some(
          (message) =>
            message?.text ||
            message?.caption ||
            message?.media ||
            (message?.type === 'Contact / Location' && message?.contactLocationType)
        ) ||
        (resolvedResponseType === 'Contact / Location' &&
          resolvedConfiguration.contactLocationType) ||
        (resolvedConfiguration.action && resolvedConfiguration.action !== 'command.template')
      )
      const needsMedia = [
        'Photo Message',
        'Video Message',
        'Document Message',
        'Audio / Voice Message',
      ].includes(resolvedResponseType)
      const hasMedia = Boolean(
        resolvedConfiguration.media ||
        resolvedConfiguration.messages?.some(
          (message) =>
            [
              'Photo Message',
              'Video Message',
              'Document Message',
              'Audio / Voice Message',
            ].includes(message?.type) && message?.media
        )
      )
      if (
        !/^\/[a-z0-9_]{1,31}$/.test(cmd) ||
        !resolvedTitle ||
        !hasConfiguredMessage ||
        (needsMedia && !hasMedia) ||
        resolvedTitle.length > 80 ||
        resolvedDescription.length > 256 ||
        resolvedTemplate.length > 4096 ||
        !allowedResponseTypes.includes(resolvedResponseType) ||
        !resolvedConfiguration ||
        typeof resolvedConfiguration !== 'object' ||
        Array.isArray(resolvedConfiguration) ||
        serializedConfiguration.length > 65536 ||
        !isValidTelegramConfiguration(resolvedConfiguration)
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Komanda, tavsif yoki javob formati noto‘g‘ri. Xabar 4096 belgidan, konfiguratsiya 64 KB dan oshmasin.',
        })
      }

      const duplicate = await TelegramCommand.findOne({
        organizationId: req.organizationId,
        command: cmd,
        ...(id ? { _id: { $ne: id } } : {}),
      })
      if (duplicate) {
        return res.status(409).json({ success: false, error: 'Bu buyruq allaqachon mavjud' })
      }

      let doc
      if (id) {
        doc = await TelegramCommand.findOneAndUpdate(
          { _id: id, organizationId: req.organizationId },
          {
            $set: {
              command: cmd,
              title: resolvedTitle,
              description: resolvedDescription,
              responseTemplate: resolvedTemplate,
              responseType: resolvedResponseType,
              configuration: resolvedConfiguration,
              isActive,
            },
            $inc: { version: 1 },
          },
          { new: true, runValidators: true }
        )
        if (!doc) return res.status(404).json({ success: false, error: 'Buyruq topilmadi' })
      } else {
        doc = await TelegramCommand.create({
          organizationId: req.organizationId,
          command: cmd,
          title: resolvedTitle,
          description: resolvedDescription,
          responseTemplate: resolvedTemplate,
          responseType: resolvedResponseType,
          configuration: resolvedConfiguration,
          isActive,
          isSystem: false,
        })
      }
      const integration = await TelegramIntegration.findOne({
        organizationId: req.organizationId,
        isActive: true,
      })
      if (integration) {
        syncBotCommandsInBackground(req.organizationId, integration.botToken)
      }
      res.json({ success: true, data: doc })
    } catch (err) {
      next(err)
    }
  },

  async deleteCommand(req, res, next) {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, error: 'Komanda identifikatori noto‘g‘ri' })
      }
      const existing = await TelegramCommand.findOne({
        _id: req.params.id,
        organizationId: req.organizationId,
      })
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Buyruq topilmadi' })
      }
      if (existing.isSystem) {
        return res
          .status(400)
          .json({ success: false, error: 'Tizim buyrug‘ini o‘chirib bo‘lmaydi, tahrirlang' })
      }
      await existing.deleteOne()
      const integration = await TelegramIntegration.findOne({
        organizationId: req.organizationId,
        isActive: true,
      })
      if (integration) syncBotCommandsInBackground(req.organizationId, integration.botToken)
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  },
}
