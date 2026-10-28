import axios from 'axios'
import { Branch, Organization, TelegramIntegration } from '../../models/index.js'

export class TelegramService {
  /**
   * Verify Telegram Bot Token by calling getMe
   */
  static async verifyBotToken(token) {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`, {
        timeout: 4000,
      })
      if (response.data && response.data.ok) {
        return {
          valid: true,
          bot: response.data.result, // id, is_bot, first_name, username
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

  /**
   * Send text message via business bot
   */
  static async sendMessage({ botToken, chatId, text, parseMode = 'HTML', replyMarkup }) {
    try {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }
      if (replyMarkup) {
        payload.reply_markup = replyMarkup
      }
      const res = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, payload, {
        timeout: 8000,
      })
      return res.data
    } catch (err) {
      console.error('Telegram sendMessage error:', err.response?.data || err.message)
      throw err
    }
  }

  /**
   * Handle incoming Webhook update from Telegram
   */
  static async handleWebhookUpdate(organizationId, update) {
    const integration = await TelegramIntegration.findOne({ organizationId, isActive: true })
    if (!integration) return

    const message = update.message
    if (!message || !message.text) return

    const chatId = message.chat.id
    const text = message.text.trim()
    const org = await Organization.findById(organizationId)
    const orgName = org?.name || 'Lubrix Avto Servis'

    // 1. /start command
    if (text === '/start') {
      const welcome =
        `Assalomu alaykum! <b>${orgName}</b> rasmiy moy almashtirish xizmati botiga xush kelibsiz.\n\n` +
        `Ushbu bot orqali siz navbatga yozilishingiz, filiallarimiz manzilini olishingiz va moy almashtirish tarixingizni kuzatishingiz mumkin.`

      const keyboard = {
        inline_keyboard: [
          [
            { text: 'Xizmatga Yozilish (Bron)', callback_data: 'book_service' },
            { text: 'Filiallar & Manzillar', callback_data: 'view_branches' },
          ],
          [
            { text: 'Mening Avtomobillarim', callback_data: 'my_vehicles' },
            { text: 'Biz Bilan Bog‘lanish', callback_data: 'contact_support' },
          ],
        ],
      }

      await this.sendMessage({
        botToken: integration.botToken,
        chatId,
        text: welcome,
        replyMarkup: keyboard,
      })
      return
    }

    // 2. /branches command
    if (text === '/branches') {
      const branches = await Branch.find({ organizationId, isActive: true })
      let branchText = `<b>${orgName} Filiallari:</b>\n\n`
      branches.forEach((b, i) => {
        branchText += `${i + 1}. <b>${b.name}</b>\nManzil: ${b.address}\nIsh vaqti: ${b.workingHours}\nTel: ${b.phone || '—'}\n\n`
      })

      await this.sendMessage({
        botToken: integration.botToken,
        chatId,
        text: branchText,
      })
      return
    }

    // Default response
    await this.sendMessage({
      botToken: integration.botToken,
      chatId,
      text: `Hurmatli mijoz, buyruqni tanlash uchun /start bosing yoki operatorimiz bilan bog‘laning: ${org?.phone || '+998712001122'}`,
    })
  }

  /**
   * Notify Business Owner via Telegram
   */
  static async notifyOwner(organizationId, eventType, data) {
    try {
      const integration = await TelegramIntegration.findOne({ organizationId, isActive: true })
      if (!integration || !integration.ownerTelegramChatId) return

      if (!integration.notifications?.[eventType]) return

      let msg = ''
      if (eventType === 'newBooking') {
        msg = `<b>Yangi Bron Qabul Qilindi!</b>\n\nMijoz: ${data.customerName}\nTel: ${data.customerPhone}\nSana: ${data.bookingDate} ${data.bookingTime}\nXizmat: ${data.serviceType}`
      } else if (eventType === 'serviceCompleted') {
        msg = `<b>Xizmat Yakunlandi</b>\n\nMijoz: ${data.customerName}\nAvto: ${data.vehicle} (${data.plate})\nSumma: ${Number(data.price).toLocaleString()} UZS`
      } else if (eventType === 'lowStock') {
        msg = `<b>Diqqat: Ombor Qoldig‘i Kamaydi!</b>\n\nMahsulot: ${data.productName}\nQoldiq: ${data.quantity} L`
      }

      if (msg) {
        await this.sendMessage({
          botToken: integration.botToken,
          chatId: integration.ownerTelegramChatId,
          text: msg,
        })
      }
    } catch (e) {
      console.warn('Telegram notifyOwner error:', e.message)
    }
  }
}
