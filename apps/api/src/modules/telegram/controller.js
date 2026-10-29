import crypto from 'crypto'
import { TelegramCommand, TelegramIntegration } from '../../models/index.js'
import { activateTelegramBot, stopTelegramPolling } from './runtime.js'
import { TelegramService } from './telegramService.js'

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
          botTokenMasked: maskedToken,
          isActive: integration.isActive,
          ownerTelegramChatId: integration.ownerTelegramChatId,
          welcomeMessage: integration.welcomeMessage,
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
        },
      })
    } catch (err) {
      next(err)
    }
  },

  // 3. Save & Activate Bot Integration
  async saveIntegration(req, res, next) {
    try {
      const { botToken, ownerTelegramChatId, welcomeMessage, notifications } = req.body
      if (!botToken) {
        return res.status(400).json({ success: false, error: 'Bot token kiritilishi shart' })
      }

      const verifyRes = await TelegramService.verifyBotToken(botToken.trim())
      if (!verifyRes.valid) {
        return res.status(400).json({ success: false, error: verifyRes.error })
      }

      const webhookSecret = crypto.randomBytes(16).toString('hex')

      const integration = await TelegramIntegration.findOneAndUpdate(
        { organizationId: req.organizationId },
        {
          organizationId: req.organizationId,
          botToken: botToken.trim(),
          botName: verifyRes.bot.first_name,
          botUsername: verifyRes.bot.username,
          webhookSecret,
          isActive: true,
          ownerTelegramChatId: ownerTelegramChatId || null,
          welcomeMessage: welcomeMessage || undefined,
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
      stopTelegramPolling(req.organizationId)
      await TelegramIntegration.findOneAndUpdate(
        { organizationId: req.organizationId },
        { isActive: false }
      )
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

  // 6. Public Webhook Handler
  async handleWebhook(req, res) {
    try {
      const { orgId } = req.params
      const update = req.body
      await TelegramService.handleWebhookUpdate(orgId, update)
      res.json({ ok: true })
    } catch (err) {
      console.error('Webhook error:', err)
      res.json({ ok: true })
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
      const { id, command, title, description, responseTemplate, isActive = true } = req.body
      const cmd = String(command || '')
        .trim()
        .replace(/^\/*/, '/')
        .toLowerCase()
      if (!cmd || cmd.length < 2 || !title || !responseTemplate) {
        return res.status(400).json({
          success: false,
          error: 'Buyruq, nomi va javob matni kiritilishi shart',
        })
      }

      let doc
      if (id) {
        doc = await TelegramCommand.findOneAndUpdate(
          { _id: id, organizationId: req.organizationId },
          { $set: { command: cmd, title, description: description || '', responseTemplate, isActive } },
          { new: true }
        )
      } else {
        doc = await TelegramCommand.create({
          organizationId: req.organizationId,
          command: cmd,
          title,
          description: description || '',
          responseTemplate,
          isActive,
          isSystem: false,
        })
      }
      res.json({ success: true, data: doc })
    } catch (err) {
      next(err)
    }
  },

  async deleteCommand(req, res, next) {
    try {
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
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  },
}
