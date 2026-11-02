import axios from 'axios'
import {
  Branch,
  Organization,
  Product,
  TelegramCommand,
  TelegramIntegration,
} from '../../models/index.js'
import { DEFAULT_BOT_COMMANDS, DEFAULT_BOT_COMMANDS_VERSION } from './commandTemplates.js'
import { TelegramFlowEngine } from './flowEngine.js'

const defaultCommandInitialization = new Map()
const TELEGRAM_NETWORK_ERROR_CODES = new Set([
  'EAI_AGAIN',
  'ENOTFOUND',
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'ERR_NETWORK',
])

function formatMoney(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export class TelegramService {
  static async verifyBotToken(token) {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`, {
        timeout: 4000,
      })
      if (response.data && response.data.ok) {
        return {
          valid: true,
          bot: response.data.result,
        }
      }
      return { valid: false, error: 'Telegram javob bermadi' }
    } catch (err) {
      const isNetworkError =
        TELEGRAM_NETWORK_ERROR_CODES.has(err.code) || err.message?.toLowerCase().includes('timeout')
      return {
        valid: false,
        error: isNetworkError
          ? 'Telegram API bilan aloqa yo‘q. DNS, internet yoki firewall ulanishini tekshiring.'
          : err.response?.data?.description || 'Noto‘g‘ri yoki faol bo‘lmagan bot token',
      }
    }
  }

  static async sendMessage({ botToken, chatId, text, parseMode = 'HTML', replyMarkup }) {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }
    if (replyMarkup) payload.reply_markup = replyMarkup
    const res = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, payload, {
      timeout: 8000,
    })
    return res.data
  }

  static async deleteWebhook(botToken) {
    await axios.post(
      `https://api.telegram.org/bot${botToken}/deleteWebhook`,
      { drop_pending_updates: false },
      { timeout: 8000 }
    )
  }

  static async ensureDefaultCommands(organizationId) {
    const key = String(organizationId)
    const existingInitialization = defaultCommandInitialization.get(key)
    if (existingInitialization) return existingInitialization

    const initialization = (async () => {
      for (const command of DEFAULT_BOT_COMMANDS) {
        const current = await TelegramCommand.findOne({ organizationId, command: command.command })
        if (!current) {
          await TelegramCommand.create({ ...command, organizationId, isActive: true })
        }
      }
      await TelegramIntegration.updateOne(
        { organizationId, defaultCommandsVersion: { $lt: DEFAULT_BOT_COMMANDS_VERSION } },
        { $set: { defaultCommandsVersion: DEFAULT_BOT_COMMANDS_VERSION } }
      )
    })()

    defaultCommandInitialization.set(key, initialization)
    try {
      await initialization
    } catch (error) {
      if (defaultCommandInitialization.get(key) === initialization) {
        defaultCommandInitialization.delete(key)
      }
      throw error
    }
  }

  static async syncBotCommands(organizationId, botToken) {
    const commands = await TelegramCommand.find({ organizationId, isActive: true }).sort({
      createdAt: 1,
    })
    await axios.post(
      `https://api.telegram.org/bot${botToken}/setMyCommands`,
      {
        commands: commands.map((command) => ({
          command: command.command.replace(/^\//, ''),
          description: String(command.title || command.description || command.command).slice(
            0,
            256
          ),
        })),
      },
      { timeout: 8000 }
    )
  }

  static async renderTemplate(organizationId, template) {
    const org = await Organization.findById(organizationId)
    const branches = await Branch.find({ organizationId, isActive: true })
    const products = await Product.find({ organizationId, isArchived: { $ne: true } }).limit(20)

    const branchText =
      branches.length === 0
        ? 'Filiallar hali qo‘shilmagan.'
        : branches
            .map(
              (b, i) =>
                `${i + 1}. ${b.name}\nManzil: ${b.address || '—'}\nIsh vaqti: ${b.workingHours || '—'}\nTel: ${b.phone || '—'}`
            )
            .join('\n\n')

    const productText =
      products.length === 0
        ? 'Mahsulotlar hali qo‘shilmagan.'
        : products.map((p) => `• ${p.brand} ${p.name} — ${formatMoney(p.price)} UZS`).join('\n')

    return String(template || '')
      .replaceAll('{{org_name}}', org?.name || 'Servis')
      .replaceAll('{business_name}', org?.name || 'Servis')
      .replaceAll('{{org_phone}}', org?.phone || '—')
      .replaceAll('{{org_address}}', org?.address || '—')
      .replaceAll('{{org_email}}', org?.email || '—')
      .replaceAll('{{branches}}', branchText)
      .replaceAll('{{products}}', productText)
  }

  static async handleWebhookUpdate(organizationId, update) {
    const integration = await TelegramIntegration.findOne({ organizationId, isActive: true })
    if (!integration) return
    await this.ensureDefaultCommands(organizationId)
    const commands = await TelegramCommand.find({ organizationId, isActive: true })
    await TelegramFlowEngine.handle(organizationId, integration, update, commands)
  }

  static async notifyOwner(organizationId, eventType, data) {
    try {
      const integration = await TelegramIntegration.findOne({ organizationId, isActive: true })
      if (!integration || !integration.ownerTelegramChatId) return
      if (!integration.notifications?.[eventType]) return

      let msg = ''
      if (eventType === 'newBooking') {
        msg = `Yangi bron\nMijoz: ${data.customerName}\nTel: ${data.customerPhone}\nSana: ${data.bookingDate} ${data.bookingTime}`
      } else if (eventType === 'serviceCompleted') {
        msg = `Xizmat yakunlandi\nMijoz: ${data.customerName}\nAvto: ${data.vehicle || ''} (${data.plate || ''})\nSumma: ${formatMoney(data.price)} UZS`
      } else if (eventType === 'lowStock') {
        msg = `Ombor qoldig‘i kam\nMahsulot: ${data.productName}\nQoldiq: ${data.quantity}`
      } else if (eventType === 'newCustomer') {
        msg = `Yangi mijoz qo‘shildi\nMijoz: ${data.customerName}\nTel: ${data.customerPhone || '—'}`
      } else if (eventType === 'planExpiry') {
        msg = `Obuna tugashiga ${data.daysLeft} kun qoldi.`
      }

      if (msg) {
        await this.sendMessage({
          botToken: integration.botToken,
          chatId: integration.ownerTelegramChatId,
          text: msg,
          parseMode: undefined,
        })
      }
    } catch (e) {
      console.warn('Telegram notifyOwner error:', e.message)
    }
  }
}
