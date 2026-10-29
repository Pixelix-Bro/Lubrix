import axios from 'axios'
import {
  Branch,
  Organization,
  Product,
  TelegramCommand,
  TelegramIntegration,
} from '../../models/index.js'
import { DEFAULT_BOT_COMMANDS } from './commandTemplates.js'

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
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout')
      return {
        valid: false,
        error: isTimeout
          ? 'Telegram serveri bilan aloqa o‘rnatib bo‘lmadi (internet ulanishini tekshiring)'
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

  static async ensureDefaultCommands(organizationId) {
    const count = await TelegramCommand.countDocuments({ organizationId })
    if (count > 0) return
    await TelegramCommand.insertMany(
      DEFAULT_BOT_COMMANDS.map((c) => ({ ...c, organizationId, isActive: true }))
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
        : products
            .map((p) => `• ${p.brand} ${p.name} — ${formatMoney(p.price)} UZS`)
            .join('\n')

    return String(template || '')
      .replaceAll('{{org_name}}', org?.name || 'Servis')
      .replaceAll('{{org_phone}}', org?.phone || '—')
      .replaceAll('{{org_address}}', org?.address || '—')
      .replaceAll('{{org_email}}', org?.email || '—')
      .replaceAll('{{branches}}', branchText)
      .replaceAll('{{products}}', productText)
  }

  static async handleWebhookUpdate(organizationId, update) {
    const integration = await TelegramIntegration.findOne({ organizationId, isActive: true })
    if (!integration) return

    const message = update.message
    if (!message || !message.text) return

    const chatId = message.chat.id
    const text = message.text.trim()
    const commandKey = text.split(/\s+/)[0].split('@')[0].toLowerCase()

    await this.ensureDefaultCommands(organizationId)
    const commands = await TelegramCommand.find({ organizationId, isActive: true })
    const matched = commands.find((c) => c.command.toLowerCase() === commandKey)

    if (matched) {
      const body = await this.renderTemplate(organizationId, matched.responseTemplate)
      await this.sendMessage({
        botToken: integration.botToken,
        chatId,
        text: body,
        parseMode: undefined,
      })
      return
    }

    await this.sendMessage({
      botToken: integration.botToken,
      chatId,
      text: 'Buyruq topilmadi. /start yuboring yoki sozlamalarda buyruqlarni tekshiring.',
      parseMode: undefined,
    })
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
