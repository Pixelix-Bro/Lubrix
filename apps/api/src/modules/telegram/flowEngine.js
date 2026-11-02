import axios from 'axios'
import crypto from 'crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import {
  Booking,
  Branch,
  Customer,
  InAppNotification,
  Organization,
  Product,
  ServiceRecord,
  TelegramMedia,
  TelegramProcessedUpdate,
  TelegramServiceCatalogItem,
  TelegramUserSession,
  Vehicle,
} from '../../models/index.js'
import { normalizePhoneE164 } from '../reminders/engine.js'
import { parsePreferredBookingTime } from './bookingValidation.js'
import {
  classifyTelegramEditError,
  getTelegramEditMethod,
  isInlineKeyboardMarkup,
} from './telegramUi.js'

const SESSION_TTL_MS = 30 * 60 * 1000
const uiContext = new AsyncLocalStorage()
const ALLOWED_ACTIONS = new Set([
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

const safeText = (value) => String(value ?? '')
const normalizePlate = (value) =>
  safeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
const formatMoney = (value) => Math.round(Number(value) || 0).toLocaleString('uz-UZ')

async function telegramCall(token, method, payload) {
  let response
  try {
    response = await axios.post(`https://api.telegram.org/bot${token}/${method}`, payload, {
      timeout: 12000,
    })
  } catch (error) {
    const message = error.response?.data?.description || 'Telegram API bilan aloqa xatosi'
    delete error.config
    delete error.request
    if (error.response) delete error.response.config
    throw new Error(message, { cause: error })
  }
  if (!response.data?.ok) {
    throw new Error(response.data?.description || `Telegram ${method} failed`)
  }
  return response.data.result
}

async function sendText(token, chatId, text, options = {}) {
  const payload = { chat_id: chatId, text: safeText(text).slice(0, 4096) }
  if (options.parseMode && ['HTML', 'Markdown', 'MarkdownV2'].includes(options.parseMode)) {
    payload.parse_mode = options.parseMode
  }
  if (options.replyMarkup) payload.reply_markup = options.replyMarkup

  const context = uiContext.getStore()
  const isCurrentPrivateScreen = context?.privateChat && String(context.chatId) === String(chatId)
  const session = isCurrentPrivateScreen
    ? await getSession(context.organizationId, context.userId, chatId)
    : null
  const activeMessage = session?.data?.activeUiMessage
  const messageId = context?.messageId || activeMessage?.messageId
  const messageType = context?.messageType || activeMessage?.type
  const canEdit =
    isCurrentPrivateScreen &&
    messageId &&
    (!options.replyMarkup || isInlineKeyboardMarkup(options.replyMarkup)) &&
    !options.forceNewMessage &&
    !(messageType === 'photo' && payload.text.length > 1024)

  if (canEdit) {
    try {
      const method = getTelegramEditMethod(messageType)
      const result = await telegramCall(token, method, {
        chat_id: chatId,
        message_id: messageId,
        [messageType === 'photo' ? 'caption' : 'text']: payload.text,
        ...(payload.parse_mode ? { parse_mode: payload.parse_mode } : {}),
        reply_markup: payload.reply_markup || { inline_keyboard: [] },
      })
      context.messageId = messageId
      context.messageType = messageType
      await rememberActiveUiMessage(context, session, {
        ...activeMessage,
        messageId,
        type: messageType,
      })
      return result
    } catch (error) {
      const classification = classifyTelegramEditError(error)
      if (classification === 'unchanged') {
        context.messageId = messageId
        context.messageType = messageType
        return { message_id: messageId }
      }
      if (classification !== 'fallback') throw error
      await telegramCall(token, 'editMessageReplyMarkup', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] },
      }).catch(() => {})
    }
  } else if (isCurrentPrivateScreen && messageId) {
    await telegramCall(token, 'editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    }).catch(() => {})
  }

  const sentMessage = await telegramCall(token, 'sendMessage', payload)
  if (isCurrentPrivateScreen && sentMessage?.message_id) {
    context.messageId = sentMessage.message_id
    context.messageType = 'text'
    await rememberActiveUiMessage(context, session, {
      messageId: sentMessage.message_id,
      type: 'text',
    })
  }
  return sentMessage
}

async function sendConfiguredMedia(
  token,
  organizationId,
  botId,
  chatId,
  method,
  reference,
  options = {}
) {
  let storedMedia
  if (String(reference || '').startsWith('media:')) {
    const mediaId = String(reference).slice(6)
    storedMedia = await TelegramMedia.findOne({
      _id: mediaId,
      organizationId,
      botId: String(botId),
    }).select('+data')
    if (!storedMedia) throw new Error('Telegram media topilmadi yoki ushbu botga tegishli emas')
  }

  if (!storedMedia) {
    const media = String(reference || '')
    if (!media || (!media.startsWith('https://') && !/^[A-Za-z0-9_-]{20,}$/.test(media))) {
      throw new Error('Telegram media formati noto‘g‘ri')
    }
    return telegramCall(token, method, {
      chat_id: chatId,
      [method === 'sendPhoto'
        ? 'photo'
        : method === 'sendVideo'
          ? 'video'
          : method === 'sendDocument'
            ? 'document'
            : method === 'sendVoice'
              ? 'voice'
              : 'audio']: media,
      ...(options.caption ? { caption: options.caption } : {}),
      ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
      ...(options.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
    })
  }

  const field =
    method === 'sendPhoto'
      ? 'photo'
      : method === 'sendVideo'
        ? 'video'
        : method === 'sendDocument'
          ? 'document'
          : method === 'sendVoice'
            ? 'voice'
            : 'audio'
  const form = new FormData()
  form.append('chat_id', String(chatId))
  form.append(
    field,
    new Blob([storedMedia.data], { type: storedMedia.mimeType }),
    storedMedia.fileName
  )
  if (options.caption) form.append('caption', options.caption)
  if (options.parseMode) form.append('parse_mode', options.parseMode)
  if (options.replyMarkup) form.append('reply_markup', JSON.stringify(options.replyMarkup))
  let response
  try {
    response = await axios.post(`https://api.telegram.org/bot${token}/${method}`, form, {
      timeout: 20000,
    })
  } catch (error) {
    const message = error.response?.data?.description || 'Telegram media yuborishda xatolik'
    delete error.config
    delete error.request
    if (error.response) delete error.response.config
    throw new Error(message, {
      cause: error,
    })
  }
  if (!response.data?.ok) throw new Error(response.data?.description || `Telegram ${method} failed`)
  return response.data.result
}

async function getSession(orgId, userId, chatId) {
  return TelegramUserSession.findOne({
    organizationId: orgId,
    telegramUserId: String(userId),
    chatId: String(chatId),
    expiresAt: { $gt: new Date() },
  })
}

async function saveSession(orgId, userId, chatId, state, data = {}) {
  return TelegramUserSession.findOneAndUpdate(
    {
      organizationId: orgId,
      telegramUserId: String(userId),
      chatId: String(chatId),
    },
    {
      $set: { state, data, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
      $setOnInsert: {
        organizationId: orgId,
        telegramUserId: String(userId),
        chatId: String(chatId),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

async function rememberActiveUiMessage(context, session, activeUiMessage) {
  if (!context) return
  const current =
    session || (await getSession(context.organizationId, context.userId, context.chatId))
  await saveSession(
    context.organizationId,
    context.userId,
    context.chatId,
    current?.state || 'idle',
    { ...(current?.data || {}), activeUiMessage }
  )
}

async function callbackButton(orgId, userId, chatId, text, action, payload = {}) {
  if (!ALLOWED_ACTIONS.has(action)) throw new Error('Unsupported Telegram callback action')
  const token = crypto.randomBytes(12).toString('base64url')
  const session = await getSession(orgId, userId, chatId)
  const data = {
    ...(session?.data || {}),
    callbacks: { ...(session?.data?.callbacks || {}), [token]: { action, payload } },
  }
  await saveSession(orgId, userId, chatId, session?.state || 'idle', data)
  return { text, callback_data: `l:${token}` }
}

async function inlineMarkup(orgId, userId, chatId, rows) {
  const keyboard = []
  const sourceRows = (rows || []).map((row) => [...(row || [])])
  const actions = new Set(
    sourceRows
      .flat()
      .map((button) => button?.action)
      .filter(Boolean)
  )
  const navigationRow = []
  if (!actions.has('flow.back')) navigationRow.push({ text: '‹ Orqaga', action: 'flow.back' })
  if (!actions.has('menu.start')) navigationRow.push({ text: '⌂ Bosh menyu', action: 'menu.start' })
  if (navigationRow.length) sourceRows.push(navigationRow)
  for (const row of sourceRows) {
    const buttons = []
    for (const button of row || []) {
      if (!button || button.isActive === false || !button.text) continue
      if (button.type === 'url') {
        let url
        try {
          url = new URL(button.url)
        } catch {
          continue
        }
        if (url.protocol === 'https:')
          buttons.push({ text: safeText(button.text).slice(0, 64), url: url.toString() })
      } else if (button.type === 'web_app') {
        let url
        try {
          url = new URL(button.url)
        } catch {
          continue
        }
        const allowed = process.env.TELEGRAM_WEBAPP_URL
        if (url.protocol === 'https:' && allowed && url.origin === new URL(allowed).origin) {
          buttons.push({
            text: safeText(button.text).slice(0, 64),
            web_app: { url: url.toString() },
          })
        }
      } else {
        buttons.push(
          await callbackButton(
            orgId,
            userId,
            chatId,
            safeText(button.text).slice(0, 64),
            button.action,
            button.payload || {}
          )
        )
      }
    }
    if (buttons.length) keyboard.push(buttons)
  }
  return keyboard.length ? { inline_keyboard: keyboard } : undefined
}

function replyMarkup(config = {}) {
  if (config.hide) return { remove_keyboard: true }
  const rows = (config.rows || [])
    .map((row) =>
      row
        .filter((button) => button?.isActive !== false)
        .map((button) => {
          if (button.requestContact)
            return {
              text: safeText(button.text || 'Telefon kontaktini yuborish'),
              request_contact: true,
            }
          if (button.requestLocation)
            return { text: safeText(button.text || 'Lokatsiyani yuborish'), request_location: true }
          return { text: safeText(button.text) }
        })
    )
    .filter((row) => row.length)
  if (!rows.length) return undefined
  return {
    keyboard: rows,
    resize_keyboard: config.resizeKeyboard !== false,
    one_time_keyboard: Boolean(config.oneTimeKeyboard),
    is_persistent: Boolean(config.isPersistent),
    selective: Boolean(config.selective),
  }
}

async function renderTemplate(orgId, template, context = {}, parseMode = '') {
  const organization = await Organization.findById(orgId).select('name phone address email')
  const values = {
    first_name: context.first_name || '',
    last_name: context.last_name || '',
    full_name: context.full_name || '',
    username: context.username ? `@${context.username}` : '',
    phone: context.phone || '',
    business_name: organization?.name || '',
    branch_name: context.branch_name || '',
    vehicle_plate: context.vehicle_plate || '',
    service_name: context.service_name || '',
    next_service_date: context.next_service_date || '',
    org_name: organization?.name || '',
    org_phone: organization?.phone || '',
    org_address: organization?.address || '',
    org_email: organization?.email || '',
  }
  return String(template || '').replace(/\{\{([a-z_]+)\}\}/gi, (_match, key) => {
    const value = safeText(values[key] || '')
    if (parseMode === 'HTML')
      return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    if (parseMode === 'MarkdownV2') return value.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1')
    if (parseMode === 'Markdown') return value.replace(/([_*`[])/g, '\\$1')
    return value
  })
}

async function getTemplateContext(orgId, user, chatId) {
  const context = {
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: [user.first_name, user.last_name].filter(Boolean).join(' '),
    username: user.username,
  }
  const session = await getSession(orgId, user.id, chatId)
  const customerId = session?.data?.verifiedCustomerId
  if (!customerId) return context
  const customer = await Customer.findOne({
    _id: customerId,
    organizationId: orgId,
    telegramChatId: String(chatId),
  }).select('fullName')
  if (!customer) return context
  context.full_name = customer.fullName || context.full_name
  context.phone = session.data.verifiedPhone || ''
  const latestRecord = await ServiceRecord.findOne({
    organizationId: orgId,
    customerId: customer._id.toString(),
  }).sort({ serviceDate: -1 })
  if (!latestRecord) return context
  const branch = await Branch.findOne({
    _id: latestRecord.branchId,
    organizationId: orgId,
  }).select('name')
  context.branch_name = branch?.name || ''
  context.vehicle_plate = latestRecord.plate || ''
  context.service_name = [latestRecord.oilBrand, latestRecord.viscosity].filter(Boolean).join(' ')
  context.next_service_date = latestRecord.nextDueDate
    ? new Date(latestRecord.nextDueDate).toLocaleDateString('uz-UZ')
    : ''
  return context
}

async function sendConfiguredMessages(orgId, integration, command, user, chatId) {
  const config = command.configuration || {}
  const steps =
    ['Multiple Messages', 'All Features'].includes(command.responseType) &&
    Array.isArray(config.messages) &&
    config.messages.length
      ? config.messages
      : [{ type: command.responseType, text: command.responseTemplate, media: config.media }]
  const templateContext = await getTemplateContext(orgId, user, chatId)
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]
    const replyConfig = index === steps.length - 1 ? config.replyKeyboard : null
    const parseMode = step.parseMode || config.parseMode
    const text = await renderTemplate(
      orgId,
      step.text || step.caption || '',
      templateContext,
      parseMode
    )
    const keyboard =
      index === steps.length - 1
        ? await inlineMarkup(orgId, user.id, chatId, step.inlineKeyboard || config.inlineKeyboard)
        : undefined
    if (step.type === 'Contact / Location') {
      const locationType = step.contactLocationType || config.contactLocationType
      if (text)
        await sendText(integration.botToken, chatId, text, {
          parseMode: step.parseMode || config.parseMode,
          forceNewMessage: steps.length > 1,
        })
      if (locationType === 'location') {
        const latitude = Number(step.latitude ?? config.latitude)
        const longitude = Number(step.longitude ?? config.longitude)
        if (
          !Number.isFinite(latitude) ||
          latitude < -90 ||
          latitude > 90 ||
          !Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180
        )
          throw new Error('Telegram lokatsiya koordinatalari noto‘g‘ri')
        await telegramCall(integration.botToken, 'sendLocation', {
          chat_id: chatId,
          latitude,
          longitude,
          ...(keyboard ? { reply_markup: keyboard } : {}),
        })
      } else {
        const organization = await Organization.findById(orgId).select('phone name')
        const phoneNumber = safeText(
          step.contactPhone || config.contactPhone || organization?.phone
        )
        const firstName = safeText(step.contactName || config.contactName || organization?.name)
        if (!phoneNumber || !firstName)
          throw new Error('Kontakt uchun telefon raqami yoki nomi kiritilmagan')
        await telegramCall(integration.botToken, 'sendContact', {
          chat_id: chatId,
          phone_number: phoneNumber,
          first_name: firstName,
          ...(keyboard ? { reply_markup: keyboard } : {}),
        })
      }
    }
    const methodByType = {
      'Photo Message': 'sendPhoto',
      'Video Message': 'sendVideo',
      'Document Message': 'sendDocument',
      'Audio / Voice Message': step.mediaType === 'voice' ? 'sendVoice' : 'sendAudio',
    }
    const mediaMethod = methodByType[step.type]
    if (step.type !== 'Contact / Location' && mediaMethod && step.media) {
      await sendConfiguredMedia(
        integration.botToken,
        orgId,
        integration.botId,
        chatId,
        mediaMethod,
        step.media,
        {
          caption: text.slice(0, 1024),
          parseMode: step.parseMode || config.parseMode,
          replyMarkup: keyboard || replyMarkup(replyConfig),
        }
      )
    } else if (step.type !== 'Contact / Location') {
      await sendText(integration.botToken, chatId, text, {
        parseMode,
        replyMarkup: keyboard || replyMarkup(replyConfig),
        forceNewMessage: steps.length > 1,
      })
    }
    if (index === steps.length - 1) {
      const current = await getSession(orgId, user.id, chatId)
      const replyActions = {}
      let replyContactAction
      let replyLocationAction
      for (const row of replyConfig?.rows || []) {
        for (const button of row || []) {
          if (button.isActive !== false && button.text && ALLOWED_ACTIONS.has(button.action)) {
            replyActions[button.text] = { action: button.action, payload: button.payload || {} }
            if (button.requestContact) {
              replyContactAction = { action: button.action, payload: button.payload || {} }
            }
            if (button.requestLocation) {
              replyLocationAction = { action: button.action, payload: button.payload || {} }
            }
          }
        }
      }
      const sessionData = { ...(current?.data || {}) }
      delete sessionData.replyActions
      delete sessionData.replyContactAction
      delete sessionData.replyLocationAction
      if (Object.keys(replyActions).length) sessionData.replyActions = replyActions
      if (replyContactAction) sessionData.replyContactAction = replyContactAction
      if (replyLocationAction) sessionData.replyLocationAction = replyLocationAction
      const locationFlow = replyLocationAction?.action === 'branches.nearby'
      await saveSession(
        orgId,
        user.id,
        chatId,
        locationFlow
          ? 'awaiting_location'
          : Object.keys(replyActions).length || replyContactAction || replyLocationAction
            ? 'awaiting_reply_action'
            : current?.state || 'idle',
        sessionData
      )
    }
  }
}

async function sendMainMenu(orgId, integration, update, welcomeTemplate) {
  const user = update.from
  const chatId = update.chat.id
  const branchCount = await Branch.countDocuments({ organizationId: orgId, isActive: true })
  const searchButton = await callbackButton(orgId, user.id, chatId, '⌕ Qidirish', 'search.menu')
  const branchesButton = await callbackButton(
    orgId,
    user.id,
    chatId,
    '⌖ Filiallar',
    'branches.regions'
  )
  const servicesButton = await callbackButton(
    orgId,
    user.id,
    chatId,
    '▤ Xizmatlar',
    'services.list'
  )
  const carsButton = await callbackButton(
    orgId,
    user.id,
    chatId,
    '▣ Avtomobillarim',
    'customer.cars'
  )
  const historyButton = await callbackButton(
    orgId,
    user.id,
    chatId,
    '◷ Xizmat tarixi',
    'customer.history'
  )
  const contactButton = await callbackButton(orgId, user.id, chatId, '◉ Operator', 'contact')
  const helpButton = await callbackButton(orgId, user.id, chatId, '? Yordam', 'menu.help')
  const bookingButton = await callbackButton(
    orgId,
    user.id,
    chatId,
    '▦ Qabulga yozilish',
    'booking.start'
  )
  const rows = [[searchButton], [branchesButton, servicesButton], [carsButton, historyButton]]
  rows.push(branchCount ? [bookingButton, contactButton] : [contactButton])
  rows.push([helpButton])
  const defaultWelcomeMessage =
    'Assalomu alaykum! {business_name} rasmiy moy almashtirish xizmati botiga xush kelibsiz.'
  const configuredWelcome = welcomeTemplate ?? integration.welcomeMessage
  const fallbackText =
    configuredWelcome && configuredWelcome !== defaultWelcomeMessage
      ? configuredWelcome
      : 'LUBRIX\n\nAvtomobilingizga kerakli xizmat — bir joyda.\nAvtomobilingizni boshqaring, xizmatlarni ko‘ring va yaqin filialni toping.'
  const text = await renderTemplate(orgId, fallbackText, {
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: [user.first_name, user.last_name].filter(Boolean).join(' '),
    username: user.username,
  })
  const photo = integration.welcomeMediaId || integration.welcomeMedia?.fileId
  const markup = { inline_keyboard: rows }
  if (photo) {
    const context = uiContext.getStore()
    const session = await getSession(orgId, user.id, chatId)
    const activeMessage = session?.data?.activeUiMessage
    const messageId = context?.messageId || activeMessage?.messageId
    const messageType = context?.messageType || activeMessage?.type
    const previousMedia = activeMessage?.mediaRef
    let updated = false

    if (messageId && messageType === 'photo' && previousMedia === photo && text.length <= 1024) {
      try {
        await telegramCall(integration.botToken, 'editMessageCaption', {
          chat_id: chatId,
          message_id: messageId,
          caption: text,
          reply_markup: markup,
        })
        updated = true
      } catch (error) {
        const classification = classifyTelegramEditError(error)
        if (classification === 'unchanged') updated = true
        else if (classification !== 'fallback') throw error
      }
    }

    if (!updated) {
      if (messageId) {
        await telegramCall(integration.botToken, 'editMessageReplyMarkup', {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] },
        }).catch(() => {})
      }
      const sent = await sendConfiguredMedia(
        integration.botToken,
        orgId,
        integration.botId,
        chatId,
        'sendPhoto',
        photo,
        { caption: text.slice(0, 1024), replyMarkup: markup }
      )
      if (context?.privateChat && sent?.message_id) {
        context.messageId = sent.message_id
        context.messageType = 'photo'
        await rememberActiveUiMessage(context, session, {
          messageId: sent.message_id,
          type: 'photo',
          mediaRef: photo,
        })
      }
    } else if (context?.privateChat) {
      context.messageId = messageId
      context.messageType = 'photo'
      await rememberActiveUiMessage(context, session, {
        messageId,
        type: 'photo',
        mediaRef: photo,
      })
    }
  } else {
    await sendText(integration.botToken, chatId, text, { replyMarkup: markup })
  }
}

async function executeAction(orgId, integration, user, chatId, action, payload = {}) {
  const session = await getSession(orgId, user.id, chatId)
  const data = session?.data || {}
  if (action === 'command.template') {
    const text = await renderTemplate(
      orgId,
      payload.text || '',
      await getTemplateContext(orgId, user, chatId),
      payload.parseMode
    )
    return sendText(integration.botToken, chatId, text)
  }
  if (action === 'menu.start')
    return sendMainMenu(orgId, integration, { from: user, chat: { id: chatId } })
  if (action === 'menu.help') {
    const keyboard = await inlineMarkup(orgId, user.id, chatId, [
      [
        { text: '⌕ Qidirish', action: 'search.menu' },
        { text: 'Filiallar', action: 'branches.regions' },
      ],
      [
        { text: 'Avtomobillarim', action: 'customer.cars' },
        { text: 'Xizmat tarixi', action: 'customer.history' },
      ],
      [{ text: 'Operator', action: 'contact' }],
      [{ text: '⌂ Bosh menyu', action: 'menu.start' }],
    ])
    return sendText(
      integration.botToken,
      chatId,
      'Yordam\n\nLubrix botidan foydalanish uchun kerakli bo‘limni tanlang.',
      { replyMarkup: keyboard }
    )
  }
  if (action === 'search.menu') {
    await saveSession(orgId, user.id, chatId, 'search_menu', { ...data, callbacks: {} })
    const keyboard = await inlineMarkup(orgId, user.id, chatId, [
      [
        { text: 'Telefon raqami orqali', action: 'search.phone' },
        { text: 'Avtomobil raqami orqali', action: 'search.plate' },
      ],
    ])
    return sendText(
      integration.botToken,
      chatId,
      'Qidiruv turini tanlang. Shaxsiy ma’lumotlar faqat o‘zingizning telefon kontaktingiz tasdiqlangandan keyin ko‘rsatiladi.',
      { replyMarkup: keyboard }
    )
  }
  if (action === 'search.phone' || action === 'customer.cars' || action === 'customer.history') {
    if (action !== 'search.phone' && data.verifiedCustomerId) {
      return sendCustomerData(
        orgId,
        integration,
        user.id,
        chatId,
        action === 'customer.cars' ? 'awaiting_contact_cars' : 'awaiting_contact_history',
        data
      )
    }
    const nextState =
      action === 'customer.cars'
        ? 'awaiting_contact_cars'
        : action === 'customer.history'
          ? 'awaiting_contact_history'
          : 'awaiting_contact'
    await saveSession(orgId, user.id, chatId, nextState, data)
    return sendText(
      integration.botToken,
      chatId,
      'Telefon raqamingizni tasdiqlash uchun quyidagi tugma orqali o‘z Telegram kontaktingizni yuboring.',
      {
        replyMarkup: replyMarkup({
          oneTimeKeyboard: true,
          rows: [[{ text: 'Telefon kontaktini yuborish', requestContact: true }]],
        }),
      }
    )
  }
  if (action === 'customer.vehicle') {
    const customer = await Customer.findOne({
      _id: data.verifiedCustomerId,
      organizationId: orgId,
      telegramChatId: String(chatId),
    })
    const vehicle = customer
      ? await Vehicle.findOne({
          _id: payload.vehicleId,
          organizationId: orgId,
          customerId: customer._id.toString(),
        })
      : null
    if (!vehicle) return sendText(integration.botToken, chatId, 'Avtomobil topilmadi.')
    const latestRecord = await ServiceRecord.findOne({
      organizationId: orgId,
      customerId: customer._id.toString(),
      $or: [{ vehicleId: vehicle._id.toString() }, { plate: vehicle.plateNumber }],
    }).sort({ serviceDate: -1 })
    const details = [
      vehicle.plateNumber,
      [vehicle.make, vehicle.model].filter(Boolean).join(' '),
      latestRecord?.serviceDate &&
        `Oxirgi xizmat: ${new Date(latestRecord.serviceDate).toLocaleDateString('uz-UZ')}`,
      latestRecord?.nextDueDate &&
        `Keyingi xizmat: ${new Date(latestRecord.nextDueDate).toLocaleDateString('uz-UZ')}`,
    ]
      .filter(Boolean)
      .join('\n')
    return sendText(integration.botToken, chatId, details, {
      replyMarkup: await inlineMarkup(orgId, user.id, chatId, [
        [{ text: '◷ Xizmat tarixi', action: 'customer.history' }],
      ]),
    })
  }
  if (action === 'search.plate') {
    await saveSession(orgId, user.id, chatId, 'awaiting_plate', data)
    return sendText(
      integration.botToken,
      chatId,
      'Avtomobil davlat raqamini kiriting. Avtomobil egasi yoki xizmat tarixini ko‘rsatish uchun keyin telefon kontaktingiz ham tasdiqlanishi kerak.'
    )
  }
  if (action === 'booking.start') {
    const customer = await Customer.findOne({
      _id: data.verifiedCustomerId,
      organizationId: orgId,
      telegramChatId: String(chatId),
    })
    if (!customer) {
      await saveSession(orgId, user.id, chatId, 'booking.awaiting_contact', data)
      return sendText(
        integration.botToken,
        chatId,
        'Tashrif so‘rovi uchun avval o‘z Telegram kontaktingizni tasdiqlang.',
        {
          replyMarkup: replyMarkup({
            oneTimeKeyboard: true,
            rows: [[{ text: 'Telefon kontaktini yuborish', requestContact: true }]],
          }),
        }
      )
    }
    const vehicles = await Vehicle.find({
      organizationId: orgId,
      customerId: customer._id.toString(),
    }).limit(20)
    const draft = { requestKey: crypto.randomUUID(), customerId: customer._id.toString() }
    if (!vehicles.length) {
      await saveSession(orgId, user.id, chatId, 'booking.awaiting_vehicle', {
        ...data,
        bookingDraft: draft,
      })
      return sendText(
        integration.botToken,
        chatId,
        'Avtomobil davlat raqamini kiriting. Bu faqat tashrif so‘rovi uchun siz kiritgan ma’lumot bo‘ladi; bot boshqa egalar haqidagi ma’lumotlarni oshkor qilmaydi.'
      )
    }
    const rows = vehicles.map((vehicle) => [
      {
        text: `${vehicle.plateNumber} · ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}`,
        action: 'booking.vehicle',
        payload: { vehicleId: vehicle._id.toString() },
      },
    ])
    await saveSession(orgId, user.id, chatId, 'booking.select_vehicle', {
      ...data,
      bookingDraft: draft,
    })
    return sendText(
      integration.botToken,
      chatId,
      'Qaysi avtomobil uchun tashrif so‘rovi qoldirasiz?',
      {
        replyMarkup: await inlineMarkup(orgId, user.id, chatId, rows),
      }
    )
  }
  if (action === 'booking.vehicle') {
    const customer = await Customer.findOne({
      _id: data.verifiedCustomerId,
      organizationId: orgId,
      telegramChatId: String(chatId),
    })
    const vehicle = customer
      ? await Vehicle.findOne({
          _id: payload.vehicleId,
          organizationId: orgId,
          customerId: customer._id.toString(),
        })
      : null
    if (!vehicle) return sendText(integration.botToken, chatId, 'Tasdiqlangan avtomobil topilmadi.')
    const bookingDraft = {
      ...(data.bookingDraft || { requestKey: crypto.randomUUID() }),
      customerId: customer._id.toString(),
      vehicleId: vehicle._id.toString(),
      plateNumber: vehicle.plateNumber,
    }
    const services = await TelegramServiceCatalogItem.find({
      organizationId: orgId,
      isActive: true,
    })
      .sort({ name: 1 })
      .limit(50)
    if (services.length) {
      const rows = services.map((service) => {
        const price =
          service.price === undefined || service.price === null
            ? 'narx belgilanmagan'
            : `${Number(service.price).toLocaleString('uz-UZ')} ${service.currency || 'UZS'}`
        return [
          {
            text: `${service.name} · ${price}`.slice(0, 64),
            action: 'booking.service',
            payload: { serviceId: service._id.toString() },
          },
        ]
      })
      await saveSession(orgId, user.id, chatId, 'booking.select_service', {
        ...data,
        bookingDraft,
      })
      return sendText(integration.botToken, chatId, 'Katalogdan xizmatni tanlang:', {
        replyMarkup: await inlineMarkup(orgId, user.id, chatId, rows),
      })
    }
    await saveSession(orgId, user.id, chatId, 'booking.awaiting_service', {
      ...data,
      bookingDraft,
    })
    return sendText(
      integration.botToken,
      chatId,
      'Kerakli xizmatni yozing (masalan, moy almashtirish). Narx va vaqt filial tomonidan tasdiqlanadi.'
    )
  }
  if (action === 'booking.service') {
    const service = await TelegramServiceCatalogItem.findOne({
      _id: payload.serviceId,
      organizationId: orgId,
      isActive: true,
    })
    if (!service) return sendText(integration.botToken, chatId, 'Faol xizmat topilmadi.')
    const bookingDraft = {
      ...(data.bookingDraft || {}),
      serviceCatalogId: service._id.toString(),
      serviceType: service.name,
      allowedBranchIds: service.branchIds || [],
    }
    await saveSession(orgId, user.id, chatId, 'booking.select_branch', {
      ...data,
      bookingDraft,
    })
    return executeAction(orgId, integration, user, chatId, 'booking.branches')
  }
  if (action === 'booking.branches') {
    const offset = Math.max(0, Number(payload.offset) || 0)
    const filter = {
      organizationId: orgId,
      isActive: true,
      ...(data.bookingDraft?.allowedBranchIds?.length
        ? { _id: { $in: data.bookingDraft.allowedBranchIds } }
        : {}),
    }
    const [branches, total] = await Promise.all([
      Branch.find(filter).sort({ region: 1, name: 1 }).skip(offset).limit(8),
      Branch.countDocuments(filter),
    ])
    if (!branches.length) {
      return sendText(
        integration.botToken,
        chatId,
        'Hozircha tashrif so‘rovi uchun faol filial mavjud emas.'
      )
    }
    const rows = branches.map((branch) => [
      {
        text: `${branch.name} · ${branch.region || branch.district || ''}`.slice(0, 64),
        action: 'booking.branch',
        payload: { branchId: branch._id.toString() },
      },
    ])
    if (offset > 0) {
      rows.push([{ text: 'Oldingi', action: 'booking.branches', payload: { offset: offset - 8 } }])
    }
    if (offset + branches.length < total) {
      rows.push([{ text: 'Keyingi', action: 'booking.branches', payload: { offset: offset + 8 } }])
    }
    rows.push([{ text: 'Bekor qilish', action: 'booking.cancel' }])
    return sendText(integration.botToken, chatId, 'Faol filialni tanlang:', {
      replyMarkup: await inlineMarkup(orgId, user.id, chatId, rows),
    })
  }
  if (action === 'booking.branch') {
    const branch = await Branch.findOne({
      _id: payload.branchId,
      organizationId: orgId,
      isActive: true,
      ...(data.bookingDraft?.allowedBranchIds?.length
        ? { _id: { $in: data.bookingDraft.allowedBranchIds } }
        : {}),
    })
    if (!branch) return sendText(integration.botToken, chatId, 'Faol filial topilmadi.')
    const bookingDraft = { ...(data.bookingDraft || {}), branchId: branch._id.toString() }
    await saveSession(orgId, user.id, chatId, 'booking.awaiting_datetime', {
      ...data,
      bookingDraft,
    })
    return sendText(
      integration.botToken,
      chatId,
      `Filial: ${branch.name}\nAfzal sana va vaqtingizni YYYY-MM-DD HH:MM formatida yuboring. Bu band slot emas, filial tasdiqlashi kerak bo‘lgan so‘rov. /cancel bilan bekor qilishingiz mumkin.`
    )
  }
  if (action === 'booking.confirm') {
    const bookingDraft = data.bookingDraft || {}
    const [customer, vehicle, branch, catalogService] = await Promise.all([
      Customer.findOne({
        _id: data.verifiedCustomerId,
        organizationId: orgId,
        telegramChatId: String(chatId),
      }),
      bookingDraft.vehicleId
        ? Vehicle.findOne({
            _id: bookingDraft.vehicleId,
            organizationId: orgId,
            customerId: data.verifiedCustomerId,
          })
        : Promise.resolve(null),
      Branch.findOne({
        _id: bookingDraft.branchId,
        organizationId: orgId,
        isActive: true,
      }),
      bookingDraft.serviceCatalogId
        ? TelegramServiceCatalogItem.findOne({
            _id: bookingDraft.serviceCatalogId,
            organizationId: orgId,
            isActive: true,
          })
        : Promise.resolve(null),
    ])
    if (
      !customer ||
      (!vehicle && !bookingDraft.plateNumber) ||
      !branch ||
      (bookingDraft.serviceCatalogId && !catalogService) ||
      (catalogService?.branchIds?.length &&
        !catalogService.branchIds.includes(branch._id.toString())) ||
      (bookingDraft.allowedBranchIds?.length &&
        !bookingDraft.allowedBranchIds.includes(branch._id.toString())) ||
      !bookingDraft.requestKey ||
      !bookingDraft.bookingDate ||
      !bookingDraft.bookingTime ||
      !bookingDraft.serviceType
    ) {
      return sendText(
        integration.botToken,
        chatId,
        'So‘rov ma’lumotlari eskirgan yoki to‘liq emas. /booking orqali qayta boshlang.'
      )
    }
    let booking
    try {
      booking = await Booking.findOneAndUpdate(
        { organizationId: orgId, requestKey: bookingDraft.requestKey },
        {
          $setOnInsert: {
            organizationId: orgId,
            requestKey: bookingDraft.requestKey,
            branchId: branch._id.toString(),
            customerName: customer.fullName,
            customerPhone: customer.phoneE164,
            telegramChatId: String(chatId),
            plateNumber: vehicle?.plateNumber || bookingDraft.plateNumber,
            serviceType: bookingDraft.serviceType,
            bookingDate: new Date(`${bookingDraft.bookingDate}T00:00:00.000Z`),
            bookingTime: bookingDraft.bookingTime,
            status: 'PENDING',
            source: 'TELEGRAM',
            notes: 'Telegram orqali kelgan, filial tasdig‘ini kutmoqda',
          },
        },
        { upsert: true, new: true, runValidators: true }
      )
    } catch (error) {
      if (error.code !== 11000) throw error
      booking = await Booking.findOne({
        organizationId: orgId,
        requestKey: bookingDraft.requestKey,
      })
      if (!booking) throw error
    }
    const ownerMessage = [
      'Yangi Telegram tashrif so‘rovi',
      `ID: ${booking._id}`,
      `Mijoz: ${customer.fullName} · ${customer.phoneE164}`,
      `Avtomobil: ${vehicle.plateNumber}`,
      `Xizmat: ${bookingDraft.serviceType}`,
      `Filial: ${branch.name}`,
      `Afzal vaqt: ${bookingDraft.bookingDate} ${bookingDraft.bookingTime}`,
      'Holat: filial tasdig‘i kutilmoqda',
    ].join('\n')
    await InAppNotification.findOneAndUpdate(
      {
        organizationId: orgId,
        type: 'TELEGRAM_BOOKING_REQUEST',
        dedupeKey: bookingDraft.requestKey,
      },
      {
        $setOnInsert: {
          organizationId: orgId,
          dedupeKey: bookingDraft.requestKey,
          type: 'TELEGRAM_BOOKING_REQUEST',
          title: `Tashrif so‘rovi ${booking._id}`,
          body: ownerMessage,
        },
      },
      { upsert: true, new: true }
    )
    if (integration.ownerTelegramChatId && integration.notifications?.newBooking !== false) {
      await sendText(integration.botToken, integration.ownerTelegramChatId, ownerMessage).catch(
        () => {}
      )
    }
    await saveSession(orgId, user.id, chatId, 'idle', {
      verifiedCustomerId: customer._id.toString(),
      verifiedPhone: data.verifiedPhone,
    })
    return sendText(
      integration.botToken,
      chatId,
      `Tashrif so‘rovingiz qabul qilindi. ID: ${booking._id}\nAfzal vaqt band qilinmadi; filial tasdiqlashi uchun siz bilan bog‘lanadi.`,
      { replyMarkup: { remove_keyboard: true } }
    )
  }
  if (action === 'booking.cancel') {
    await saveSession(
      orgId,
      user.id,
      chatId,
      'idle',
      data.verifiedCustomerId
        ? { verifiedCustomerId: data.verifiedCustomerId, verifiedPhone: data.verifiedPhone }
        : {}
    )
    return sendText(integration.botToken, chatId, 'Tashrif so‘rovi bekor qilindi.')
  }
  if (action === 'branches.regions') {
    const branches = await Branch.find({ organizationId: orgId, isActive: true }).select(
      'region district'
    )
    const regions = [
      ...new Set(branches.map((branch) => branch.region?.trim()).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b))
    if (!regions.length)
      return sendText(
        integration.botToken,
        chatId,
        'Faol filiallar hali kiritilmagan yoki ularga hudud belgilanmagan.'
      )
    const rows = []
    for (let index = 0; index < regions.length; index += 2) {
      rows.push(
        regions
          .slice(index, index + 2)
          .map((region) => ({ text: region, action: 'branches.list', payload: { region } }))
      )
    }
    rows.push([{ text: 'Yaqin filialni topish', action: 'branches.nearby' }])
    return sendText(integration.botToken, chatId, 'Qaysi viloyatdan filial qidiryapsiz?', {
      replyMarkup: await inlineMarkup(orgId, user.id, chatId, rows),
    })
  }
  if (action === 'branches.list') {
    const region = safeText(payload.region)
    const offset = Math.max(0, Number(payload.offset) || 0)
    const filter = { organizationId: orgId, isActive: true, region }
    const [branches, total] = await Promise.all([
      Branch.find(filter).sort({ name: 1 }).skip(offset).limit(10),
      Branch.countDocuments(filter),
    ])
    if (!branches.length)
      return sendText(integration.botToken, chatId, 'Bu hududda faol filial mavjud emas.')
    const rows = []
    for (const branch of branches)
      rows.push([
        {
          text: `${branch.name} · ${branch.district || branch.address}`,
          action: 'branch.details',
          payload: { branchId: branch._id.toString() },
        },
      ])
    rows.push([
      { text: 'Barcha filiallar lokatsiyasi', action: 'branches.all', payload: { region } },
    ])
    if (offset > 0)
      rows.push([
        {
          text: 'Oldingi',
          action: 'branches.list',
          payload: { region, offset: Math.max(0, offset - 10) },
        },
      ])
    if (offset + branches.length < total)
      rows.push([
        { text: 'Keyingi', action: 'branches.list', payload: { region, offset: offset + 10 } },
      ])
    rows.push([
      { text: 'Boshqa viloyat', action: 'branches.regions' },
      { text: 'Asosiy menyu', action: 'menu.start' },
    ])
    return sendText(integration.botToken, chatId, `Hudud: ${region}\nFilialni tanlang:`, {
      replyMarkup: await inlineMarkup(orgId, user.id, chatId, rows),
    })
  }
  if (action === 'branches.all') {
    const offset = Math.max(0, Number(payload.offset) || 0)
    const filter = { organizationId: orgId, isActive: true }
    if (payload.region) filter.region = safeText(payload.region)
    const [branches, total] = await Promise.all([
      Branch.find(filter).sort({ region: 1, name: 1 }).skip(offset).limit(10),
      Branch.countDocuments(filter),
    ])
    if (!branches.length)
      return sendText(integration.botToken, chatId, 'Faol filiallar mavjud emas.')
    for (const branch of branches)
      await sendBranch(orgId, integration, chatId, branch, true, user.id)
    if (offset + branches.length < total) {
      const next = await callbackButton(
        orgId,
        user.id,
        chatId,
        'Keyingi filiallar',
        'branches.all',
        {
          ...(payload.region ? { region: payload.region } : {}),
          offset: offset + 10,
        }
      )
      await sendText(
        integration.botToken,
        chatId,
        `Keyingi filiallar (${offset + 11}–${Math.min(offset + 20, total)} / ${total})`,
        {
          replyMarkup: { inline_keyboard: [[next]] },
        }
      )
    }
    return
  }
  if (action === 'branches.nearby') {
    await saveSession(orgId, user.id, chatId, 'awaiting_location', data)
    return sendText(
      integration.botToken,
      chatId,
      'Yaqin filialni topish uchun joriy lokatsiyangizni yuboring.',
      {
        replyMarkup: replyMarkup({
          oneTimeKeyboard: true,
          rows: [[{ text: 'Lokatsiyani yuborish', requestLocation: true }]],
        }),
      }
    )
  }
  if (action === 'branch.details') {
    const branch = await Branch.findOne({
      _id: payload.branchId,
      organizationId: orgId,
      isActive: true,
    })
    if (!branch) return sendText(integration.botToken, chatId, 'Filial topilmadi yoki faol emas.')
    return sendBranch(orgId, integration, chatId, branch, false, user.id)
  }
  if (action === 'branch.location') {
    const branch = await Branch.findOne({
      _id: payload.branchId,
      organizationId: orgId,
      isActive: true,
    })
    if (
      !branch ||
      !Number.isFinite(branch.latitude) ||
      branch.latitude < -90 ||
      branch.latitude > 90 ||
      !Number.isFinite(branch.longitude) ||
      branch.longitude < -180 ||
      branch.longitude > 180
    ) {
      return sendText(integration.botToken, chatId, 'Filial lokatsiyasi hozircha mavjud emas.')
    }
    return telegramCall(integration.botToken, 'sendLocation', {
      chat_id: chatId,
      latitude: branch.latitude,
      longitude: branch.longitude,
    })
  }
  if (action === 'products.list') {
    const products = await Product.find({ organizationId: orgId, isArchived: { $ne: true } })
      .select('name brand price packageSizes')
      .limit(20)
    if (!products.length)
      return sendText(integration.botToken, chatId, 'Mahsulotlar katalogi hozircha bo‘sh.')
    return sendText(
      integration.botToken,
      chatId,
      products
        .map(
          (product) =>
            `• ${product.brand} ${product.name} — ${formatMoney(product.price)} UZS${product.packageSizes?.length ? ` (${product.packageSizes.join(', ')})` : ''}`
        )
        .join('\n')
    )
  }
  if (action === 'services.list') {
    const offset = Math.max(0, Number(payload.offset) || 0)
    const activeBranches = await Branch.find({ organizationId: orgId, isActive: true }).select(
      '_id'
    )
    const activeBranchIds = activeBranches.map((branch) => branch._id.toString())
    const filter = {
      organizationId: orgId,
      isActive: true,
      $or: [
        { branchIds: { $exists: false } },
        { branchIds: { $size: 0 } },
        { branchIds: { $in: activeBranchIds } },
      ],
    }
    const [services, total] = await Promise.all([
      TelegramServiceCatalogItem.find(filter).sort({ name: 1 }).skip(offset).limit(10),
      TelegramServiceCatalogItem.countDocuments(filter),
    ])
    if (services.length) {
      const rows = services.map((service) => {
        const price =
          service.price === undefined || service.price === null
            ? ''
            : ` · ${Number(service.price).toLocaleString('uz-UZ')} ${service.currency || 'UZS'}`
        return [
          {
            text: `${service.name}${price}`.slice(0, 64),
            action: 'services.details',
            payload: { serviceId: service._id.toString() },
          },
        ]
      })
      if (offset > 0)
        rows.push([{ text: 'Oldingi', action: 'services.list', payload: { offset: offset - 10 } }])
      if (offset + services.length < total)
        rows.push([{ text: 'Keyingi', action: 'services.list', payload: { offset: offset + 10 } }])
      if (await Branch.exists({ organizationId: orgId, isActive: true }))
        rows.push([{ text: '▦ Qabulga yozilish', action: 'booking.start' }])
      return sendText(
        integration.botToken,
        chatId,
        `Xizmatlar (${offset + 1}–${Math.min(offset + services.length, total)} / ${total}). Tafsilot uchun xizmatni tanlang.`,
        {
          replyMarkup: await inlineMarkup(orgId, user.id, chatId, rows),
        }
      )
    }
    return sendText(
      integration.botToken,
      chatId,
      'Xizmatlar katalogi hozircha bo‘sh. Narx va mavjud xizmatlar haqida faol filial bilan bog‘laning.',
      {
        replyMarkup: await inlineMarkup(orgId, user.id, chatId, [
          [
            { text: 'Filiallar', action: 'branches.regions' },
            { text: 'Aloqa', action: 'contact' },
          ],
        ]),
      }
    )
  }
  if (action === 'services.details') {
    const service = await TelegramServiceCatalogItem.findOne({
      _id: payload.serviceId,
      organizationId: orgId,
      isActive: true,
    })
    if (!service) return sendText(integration.botToken, chatId, 'Faol xizmat topilmadi.')
    const price =
      service.price === undefined || service.price === null
        ? 'Narx belgilanmagan'
        : `${Number(service.price).toLocaleString('uz-UZ')} ${service.currency || 'UZS'}`
    const lines = [service.name, service.description, `Narx: ${price}`]
    if (service.durationMinutes) lines.push(`Davomiyligi: ${service.durationMinutes} daqiqa`)
    return sendText(integration.botToken, chatId, lines.filter(Boolean).join('\n\n'), {
      replyMarkup: await inlineMarkup(orgId, user.id, chatId, [
        [
          { text: '▦ Qabulga yozilish', action: 'booking.start' },
          { text: '‹ Xizmatlarga qaytish', action: 'services.list' },
        ],
      ]),
    })
  }
  if (action === 'contact') {
    const organization = await Organization.findById(orgId).select('name phone address email')
    const branches = await Branch.find({ organizationId: orgId, isActive: true })
      .select('name phone address')
      .limit(10)
    const contact = [
      organization?.name,
      organization?.phone,
      organization?.address,
      organization?.email,
    ]
      .filter(Boolean)
      .join('\n')
    const branchContact = branches
      .map(
        (branch) => `${branch.name}: ${branch.phone || branch.address || 'Aloqa ma’lumoti yo‘q'}`
      )
      .join('\n')
    return sendText(
      integration.botToken,
      chatId,
      [contact, branchContact].filter(Boolean).join('\n\n') || 'Aloqa ma’lumotlari kiritilmagan.',
      {
        replyMarkup: await inlineMarkup(orgId, user.id, chatId, [
          [{ text: 'Murojaat yuborish', action: 'contact.request' }],
        ]),
      }
    )
  }
  if (action === 'contact.request') {
    return sendText(integration.botToken, chatId, 'Murojaat turini tanlang:', {
      replyMarkup: await inlineMarkup(orgId, user.id, chatId, [
        [{ text: 'Xizmat bo‘yicha', action: 'contact.type', payload: { type: 'service' } }],
        [{ text: 'Tashrif so‘rovi', action: 'contact.type', payload: { type: 'booking' } }],
        [{ text: 'Boshqa savol', action: 'contact.type', payload: { type: 'other' } }],
      ]),
    })
  }
  if (action === 'contact.type') {
    const type = ['service', 'booking', 'other'].includes(payload.type) ? payload.type : 'other'
    await saveSession(orgId, user.id, chatId, 'contact.awaiting_message', {
      ...data,
      contactDraft: { type, requestKey: crypto.randomUUID() },
    })
    return sendText(
      integration.botToken,
      chatId,
      'Savolingizni yuboring (3–1000 belgi). Bekor qilish uchun /cancel yuboring.'
    )
  }
  if (action === 'flow.cancel') {
    const { callbacks, verifiedCustomerId } = data
    await saveSession(
      orgId,
      user.id,
      chatId,
      'idle',
      verifiedCustomerId ? { verifiedCustomerId, callbacks: callbacks || {} } : {}
    )
    return sendText(integration.botToken, chatId, 'Joriy jarayon bekor qilindi.', {
      replyMarkup: { remove_keyboard: true },
    })
  }
  if (action === 'flow.back') {
    const previous = payload.previous
    if (
      previous?.action &&
      ALLOWED_ACTIONS.has(previous.action) &&
      previous.action !== 'flow.back'
    ) {
      return executeAction(orgId, integration, user, chatId, previous.action, previous.payload)
    }
    return executeAction(orgId, integration, user, chatId, 'menu.start')
  }
  return sendText(integration.botToken, chatId, 'Bu amal mavjud emas.')
}

async function sendBranch(orgId, integration, chatId, branch, includeLocation = false, userId) {
  const details = [
    `${branch.name}`,
    [branch.region, branch.district].filter(Boolean).join(' · '),
    branch.address,
    branch.phone && `Tel: ${branch.phone}`,
    branch.workingHours && `Ish vaqti: ${branch.workingHours}`,
  ]
    .filter(Boolean)
    .join('\n')
  const replyMarkup =
    !includeLocation && userId
      ? await inlineMarkup(orgId, userId, chatId, [
          [
            {
              text: '⌖ Joylashuvni ochish',
              action: 'branch.location',
              payload: { branchId: branch._id.toString() },
            },
          ],
        ])
      : undefined
  await sendText(integration.botToken, chatId, details, {
    ...(replyMarkup ? { replyMarkup } : {}),
    forceNewMessage: includeLocation,
  })
  if (!includeLocation) return
  if (
    Number.isFinite(branch.latitude) &&
    branch.latitude >= -90 &&
    branch.latitude <= 90 &&
    Number.isFinite(branch.longitude) &&
    branch.longitude >= -180 &&
    branch.longitude <= 180
  ) {
    await telegramCall(integration.botToken, 'sendLocation', {
      chat_id: chatId,
      latitude: branch.latitude,
      longitude: branch.longitude,
    })
  } else {
    await sendText(integration.botToken, chatId, 'Filial lokatsiyasi hozircha mavjud emas.')
  }
}

async function sendCustomerData(orgId, integration, userId, chatId, state, data) {
  const customer = await Customer.findOne({
    _id: data.verifiedCustomerId,
    organizationId: orgId,
    telegramChatId: String(chatId),
  })
  if (!customer)
    return sendText(
      integration.botToken,
      chatId,
      'Ma’lumotni ko‘rish uchun telefon kontaktingizni qayta tasdiqlang.'
    )
  if (state === 'awaiting_contact_cars') {
    const vehicles = await Vehicle.find({
      organizationId: orgId,
      customerId: customer._id.toString(),
    }).limit(20)
    if (!vehicles.length)
      return sendText(
        integration.botToken,
        chatId,
        'Hisobingizga biriktirilgan avtomobillar topilmadi.'
      )
    return sendText(
      integration.botToken,
      chatId,
      'Avtomobillarim\nTafsilot uchun avtomobilni tanlang.',
      {
        replyMarkup: await inlineMarkup(
          orgId,
          userId,
          chatId,
          vehicles.map((vehicle) => [
            {
              text: `${vehicle.plateNumber} · ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}`.slice(
                0,
                64
              ),
              action: 'customer.vehicle',
              payload: { vehicleId: vehicle._id.toString() },
            },
          ])
        ),
      }
    )
  }
  const records = await ServiceRecord.find({
    organizationId: orgId,
    customerId: customer._id.toString(),
  })
    .sort({ serviceDate: -1 })
    .limit(20)
  if (!records.length)
    return sendText(integration.botToken, chatId, 'Sizga tegishli xizmatlar tarixi topilmadi.')
  return sendText(
    integration.botToken,
    chatId,
    records
      .map(
        (record) =>
          `${new Date(record.serviceDate).toLocaleDateString('uz-UZ')} · ${record.plate || record.vehicle || 'Avtomobil'} · ${record.oilBrand} ${record.viscosity} · ${formatMoney(record.price)} UZS`
      )
      .join('\n')
  )
}

async function handleContact(orgId, integration, message, session) {
  const contact = message.contact
  if (!contact || String(contact.user_id || '') !== String(message.from.id)) {
    return sendText(
      integration.botToken,
      message.chat.id,
      'Faqat Telegram profilingizdagi o‘z kontaktingizni yuboring.'
    )
  }
  const phone = normalizePhoneE164(contact.phone_number)
  const customer = await Customer.findOne({
    organizationId: orgId,
    phoneE164: phone,
    customerType: { $ne: 'WALK_IN' },
  })
  if (
    !customer ||
    (customer.telegramChatId && customer.telegramChatId !== String(message.chat.id))
  ) {
    await saveSession(orgId, message.from.id, message.chat.id, 'idle', {})
    return sendText(
      integration.botToken,
      message.chat.id,
      'Bu Telegram kontaktda tasdiqlangan mijoz profili topilmadi. Filial bilan bog‘laning.',
      { replyMarkup: { remove_keyboard: true } }
    )
  }
  customer.telegramChatId = String(message.chat.id)
  customer.telegramConsentAt = new Date()
  await customer.save()
  const data = {
    ...(session?.data || {}),
    verifiedCustomerId: customer._id.toString(),
    verifiedPhone: phone,
  }
  const requestedState = session?.state
  await saveSession(orgId, message.from.id, message.chat.id, requestedState, data)
  if (requestedState === 'awaiting_contact_cars' || requestedState === 'awaiting_contact_history') {
    return sendCustomerData(
      orgId,
      integration,
      message.from.id,
      message.chat.id,
      requestedState,
      data
    )
  }
  if (requestedState === 'booking.awaiting_contact') {
    return executeAction(orgId, integration, message.from, message.chat.id, 'booking.start')
  }
  if (data.pendingPlate) {
    const vehicle = await findVehicle(orgId, data.pendingPlate)
    if (!vehicle || vehicle.customerId !== customer._id.toString()) {
      return sendText(
        integration.botToken,
        message.chat.id,
        'Bu davlat raqami siz tasdiqlagan mijoz profiliga bog‘lanmagan.',
        { replyMarkup: { remove_keyboard: true } }
      )
    }
    await saveSession(orgId, message.from.id, message.chat.id, 'idle', {
      verifiedCustomerId: customer._id.toString(),
      verifiedPhone: phone,
    })
    return sendText(
      integration.botToken,
      message.chat.id,
      `${vehicle.plateNumber} · ${[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Model kiritilmagan'}\nYurgan masofasi: ${vehicle.currentOdometerKm || 0} km`,
      { replyMarkup: { remove_keyboard: true } }
    )
  }
  if (data.replyContactAction) {
    const replyAction = data.replyContactAction
    const verifiedData = { ...data }
    delete verifiedData.replyContactAction
    await saveSession(orgId, message.from.id, message.chat.id, 'idle', verifiedData)
    if (replyAction.action === 'customer.cars' || replyAction.action === 'customer.history') {
      return sendCustomerData(
        orgId,
        integration,
        message.from.id,
        message.chat.id,
        replyAction.action === 'customer.cars'
          ? 'awaiting_contact_cars'
          : 'awaiting_contact_history',
        verifiedData
      )
    }
    if (replyAction.action === 'search.phone') {
      return sendText(integration.botToken, message.chat.id, 'Telefon raqamingiz tasdiqlandi.')
    }
    return executeAction(
      orgId,
      integration,
      message.from,
      message.chat.id,
      replyAction.action,
      replyAction.payload
    )
  }
  await saveSession(orgId, message.from.id, message.chat.id, 'idle', data)
  return sendText(
    integration.botToken,
    message.chat.id,
    'Telefon raqamingiz tasdiqlandi. Endi faqat sizga tegishli avtomobil va xizmat ma’lumotlarini ko‘rishingiz mumkin.',
    { replyMarkup: { remove_keyboard: true } }
  )
}

async function findVehicle(orgId, plate) {
  const normalized = normalizePlate(plate)
  if (!normalized) return null
  const pattern = normalized.split('').join('[^A-Z0-9]*')
  return Vehicle.findOne({
    organizationId: orgId,
    plateNumber: { $regex: `^${pattern}$`, $options: 'i' },
  })
}

async function handleMessage(orgId, integration, message, commands) {
  const user = message.from
  const chatId = message.chat.id
  if (message.chat.type !== 'private') {
    return sendText(
      integration.botToken,
      chatId,
      'Shaxsiy ma’lumotlarni himoya qilish uchun bot bilan private chatda ishlang.'
    )
  }
  if (message.contact) {
    const session = await getSession(orgId, user.id, chatId)
    return handleContact(orgId, integration, message, session)
  }
  if (message.location) {
    const session = await getSession(orgId, user.id, chatId)
    if (session?.state !== 'awaiting_location') {
      return sendText(
        integration.botToken,
        chatId,
        'Avval /branches orqali yaqin filial qidiruvini boshlang.'
      )
    }
    const { latitude, longitude } = message.location
    const branches = await Branch.find({
      organizationId: orgId,
      isActive: true,
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null },
      $and: [{ latitude: { $gte: -90, $lte: 90 } }, { longitude: { $gte: -180, $lte: 180 } }],
    })
    const locationData = { ...(session.data || {}) }
    delete locationData.replyLocationAction
    await saveSession(orgId, user.id, chatId, 'idle', locationData)
    if (!branches.length) {
      return sendText(
        integration.botToken,
        chatId,
        'Koordinatasi kiritilgan faol filiallar mavjud emas.',
        {
          replyMarkup: { remove_keyboard: true },
        }
      )
    }
    const radians = (value) => (value * Math.PI) / 180
    const distance = (branch) => {
      const dLat = radians(branch.latitude - latitude)
      const dLon = radians(branch.longitude - longitude)
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(radians(latitude)) * Math.cos(radians(branch.latitude)) * Math.sin(dLon / 2) ** 2
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }
    const nearest = branches.sort((left, right) => distance(left) - distance(right))[0]
    await sendText(integration.botToken, chatId, 'Sizga eng yaqin faol filial:')
    return sendBranch(orgId, integration, chatId, nearest, true, user.id)
  }
  if (!message.text) return
  const text = message.text.trim()
  const session = await getSession(orgId, user.id, chatId)
  if (text.startsWith('/')) {
    const commandName = text.split(/\s+/)[0].split('@')[0].toLowerCase()
    const command = commands.find(
      (item) => item.command.toLowerCase() === commandName && item.isActive
    )
    if (!command)
      return sendText(integration.botToken, chatId, 'Komanda topilmadi. /help buyrug‘ini yuboring.')
    const action = command.configuration?.action || 'command.template'
    if (action === 'menu.start') {
      return sendMainMenu(orgId, integration, message, command.responseTemplate)
    }
    if (action === 'flow.cancel') {
      await saveSession(
        orgId,
        user.id,
        chatId,
        'idle',
        session?.data?.verifiedCustomerId
          ? { verifiedCustomerId: session.data.verifiedCustomerId }
          : {}
      )
      return sendText(integration.botToken, chatId, 'Joriy jarayon bekor qilindi.', {
        replyMarkup: { remove_keyboard: true },
      })
    }
    if (action !== 'command.template' && ALLOWED_ACTIONS.has(action)) {
      return executeAction(orgId, integration, user, chatId, action)
    }
    return sendConfiguredMessages(orgId, integration, command, user, chatId)
  }
  const replyAction = session?.data?.replyActions?.[text]
  if (replyAction && ALLOWED_ACTIONS.has(replyAction.action)) {
    return executeAction(orgId, integration, user, chatId, replyAction.action, replyAction.payload)
  }
  if (!session)
    return sendText(
      integration.botToken,
      chatId,
      'Boshlash uchun /start yuboring. Jarayonni bekor qilish uchun /cancel yuboring.'
    )
  if (session.state === 'contact.awaiting_message') {
    const messageText = text.trim()
    if (messageText.length < 3 || messageText.length > 1000) {
      return sendText(
        integration.botToken,
        chatId,
        'Murojaat 3–1000 belgi bo‘lishi kerak. Qayta yuboring yoki /cancel yuboring.'
      )
    }
    const requestKey = session.data?.contactDraft?.requestKey
    if (!requestKey) {
      await saveSession(orgId, user.id, chatId, 'idle', {})
      return sendText(
        integration.botToken,
        chatId,
        'Murojaat sessiyasi eskirgan. /contact orqali qayta boshlang.'
      )
    }
    const topic = session.data.contactDraft.type || 'other'
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
    const supportBody = [
      `Turi: ${topic}`,
      `Telegram: ${fullName || user.username || String(user.id)}`,
      `Chat ID: ${chatId}`,
      session.data.verifiedPhone ? `Tasdiqlangan telefon: ${session.data.verifiedPhone}` : '',
      `Murojaat: ${messageText}`,
    ]
      .filter(Boolean)
      .join('\n')
    await InAppNotification.findOneAndUpdate(
      { organizationId: orgId, dedupeKey: requestKey },
      {
        $setOnInsert: {
          organizationId: orgId,
          dedupeKey: requestKey,
          type: 'TELEGRAM_SUPPORT_REQUEST',
          title: `Telegram murojaati: ${topic}`,
          body: supportBody,
        },
      },
      { upsert: true, new: true }
    )
    if (integration.ownerTelegramChatId) {
      await sendText(integration.botToken, integration.ownerTelegramChatId, supportBody).catch(
        () => {}
      )
    }
    await saveSession(
      orgId,
      user.id,
      chatId,
      'idle',
      session.data.verifiedCustomerId
        ? {
            verifiedCustomerId: session.data.verifiedCustomerId,
            verifiedPhone: session.data.verifiedPhone,
          }
        : {}
    )
    return sendText(
      integration.botToken,
      chatId,
      'Murojaatingiz CRM operator inbox’iga yuborildi. Bu avtomatik live-chat emas; operator siz bilan mavjud aloqa kanali orqali bog‘lanadi.'
    )
  }
  if (session.state === 'booking.awaiting_vehicle') {
    const plate = normalizePlate(text)
    if (!plate || plate.length < 5 || plate.length > 10) {
      return sendText(
        integration.botToken,
        chatId,
        'Davlat raqami formati noto‘g‘ri. Qayta kiriting yoki /cancel yuboring.'
      )
    }
    const bookingDraft = {
      ...(session.data.bookingDraft || { requestKey: crypto.randomUUID() }),
      plateNumber: plate,
    }
    await saveSession(orgId, user.id, chatId, 'booking.awaiting_service', {
      ...session.data,
      bookingDraft,
    })
    return sendText(
      integration.botToken,
      chatId,
      'Kerakli xizmatni yozing. Narx filial tomonidan tasdiqlanadi. /cancel bilan bekor qilishingiz mumkin.'
    )
  }
  if (session.state === 'booking.awaiting_service') {
    const serviceType = text.trim().slice(0, 100)
    if (serviceType.length < 2) {
      return sendText(
        integration.botToken,
        chatId,
        'Xizmat nomini kamida 2 belgi bilan yozing yoki /cancel yuboring.'
      )
    }
    await saveSession(orgId, user.id, chatId, 'booking.select_branch', {
      ...session.data,
      bookingDraft: { ...session.data.bookingDraft, serviceType },
    })
    return executeAction(orgId, integration, user, chatId, 'booking.branches')
  }
  if (session.state === 'booking.awaiting_datetime') {
    const preferredTime = parsePreferredBookingTime(text)
    if (!preferredTime) {
      return sendText(
        integration.botToken,
        chatId,
        'Sana yoki vaqt yaroqsiz. Kelajakdagi vaqtni YYYY-MM-DD HH:MM formatida qayta yuboring yoki /cancel yuboring.'
      )
    }
    const bookingDraft = {
      ...session.data.bookingDraft,
      bookingDate: preferredTime.bookingDate.toISOString().slice(0, 10),
      bookingTime: preferredTime.bookingTime,
    }
    await saveSession(orgId, user.id, chatId, 'booking.confirmation', {
      ...session.data,
      bookingDraft,
    })
    const branch = await Branch.findOne({
      _id: bookingDraft.branchId,
      organizationId: orgId,
      isActive: true,
    }).select('name')
    const keyboard = await inlineMarkup(orgId, user.id, chatId, [
      [
        { text: 'Tasdiqlash', action: 'booking.confirm' },
        { text: 'Bekor qilish', action: 'booking.cancel' },
      ],
    ])
    return sendText(
      integration.botToken,
      chatId,
      `Tashrif so‘rovi:\nAvtomobil: ${bookingDraft.plateNumber}\nXizmat: ${bookingDraft.serviceType}\nFilial: ${branch?.name || '—'}\nAfzal vaqt: ${bookingDraft.bookingDate} ${bookingDraft.bookingTime}\n\nVaqt band qilinmaydi; filial so‘rovni tasdiqlashi kerak.`,
      { replyMarkup: keyboard }
    )
  }
  if (session.state === 'awaiting_plate') {
    const pendingPlate = normalizePlate(text)
    if (!pendingPlate || pendingPlate.length < 5 || pendingPlate.length > 10)
      return sendText(
        integration.botToken,
        chatId,
        'Davlat raqami formati noto‘g‘ri. Qayta kiriting yoki /cancel yuboring.'
      )
    await saveSession(orgId, user.id, chatId, 'awaiting_plate_contact', {
      ...(session.data || {}),
      pendingPlate,
    })
    return executeAction(orgId, integration, user, chatId, 'search.phone')
  }
  if (session.state === 'awaiting_plate_contact') {
    return sendText(
      integration.botToken,
      chatId,
      'Avtomobil egasini ko‘rsatish uchun o‘z telefon kontaktingizni tasdiqlang yoki /cancel yuboring.',
      {
        replyMarkup: replyMarkup({
          oneTimeKeyboard: true,
          rows: [[{ text: 'Telefon kontaktini yuborish', requestContact: true }]],
        }),
      }
    )
  }
  const command = commands.find((item) => item.command === '/start')
  if (command) return sendConfiguredMessages(orgId, integration, command, user, chatId)
}

async function handleCallback(orgId, integration, callback) {
  try {
    await telegramCall(integration.botToken, 'answerCallbackQuery', {
      callback_query_id: callback.id,
    })
  } catch (error) {
    if (/query is too old|query id is invalid/i.test(error.message)) return
    throw error
  }
  const chatId = callback.message?.chat?.id
  const userId = callback.from?.id
  const token = String(callback.data || '').startsWith('l:') ? callback.data.slice(2) : ''
  if (!chatId || !userId || !/^[A-Za-z0-9_-]{16}$/.test(token)) return
  const session = await TelegramUserSession.findOneAndUpdate(
    {
      organizationId: orgId,
      telegramUserId: String(userId),
      chatId: String(chatId),
      expiresAt: { $gt: new Date() },
      [`data.callbacks.${token}`]: { $exists: true },
    },
    { $unset: { [`data.callbacks.${token}`]: 1 } },
    { new: false }
  )
  const action = session?.data?.callbacks?.[token]
  if (!action)
    return sendText(
      integration.botToken,
      chatId,
      'Bu tugma eskirgan. /start orqali menyuni qayta oching.'
    )
  const callbacks = { ...(session.data.callbacks || {}) }
  delete callbacks[token]
  const navigationStack = [...(session.data.navigationStack || [])]
  let currentScreen = session.data.currentScreen
  let actionPayload = action.payload
  if (action.action === 'flow.back') {
    actionPayload = { previous: navigationStack.pop() }
    currentScreen = actionPayload.previous || null
  } else if (action.action === 'menu.start') {
    navigationStack.length = 0
    currentScreen = { action: action.action, payload: action.payload }
  } else {
    if (currentScreen) navigationStack.push(currentScreen)
    if (navigationStack.length > 12) navigationStack.shift()
    currentScreen = { action: action.action, payload: action.payload }
  }
  await saveSession(orgId, userId, chatId, session.state, {
    ...session.data,
    callbacks,
    navigationStack,
    currentScreen,
  })
  return executeAction(orgId, integration, callback.from, chatId, action.action, actionPayload)
}

export class TelegramFlowEngine {
  static async testCommand(organizationId, integration, command, chatId) {
    await sendConfiguredMessages(organizationId, integration, command, { id: chatId }, chatId)
  }

  static async handle(organizationId, integration, update, commands) {
    const callbackMessage = update.callback_query?.message
    const message = update.message
    const source = callbackMessage || message
    const user = update.callback_query?.from || message?.from
    const chatId = source?.chat?.id
    const context = {
      organizationId,
      userId: user?.id,
      chatId,
      privateChat: source?.chat?.type === 'private',
      ...(callbackMessage
        ? {
            messageId: callbackMessage.message_id,
            messageType: callbackMessage.photo?.length ? 'photo' : 'text',
          }
        : {}),
    }
    return uiContext.run(context, async () => {
      const updateId = Number(update.update_id)
      let receipt
      if (Number.isFinite(updateId)) {
        try {
          receipt = await TelegramProcessedUpdate.create({
            organizationId,
            updateId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })
        } catch (error) {
          if (error.code === 11000) return
          throw error
        }
      }
      try {
        if (update.callback_query)
          await handleCallback(organizationId, integration, update.callback_query)
        else if (message) await handleMessage(organizationId, integration, message, commands)
        if (receipt) {
          receipt.status = 'PROCESSED'
          await receipt.save()
        }
      } catch (error) {
        if (receipt) await TelegramProcessedUpdate.deleteOne({ _id: receipt._id }).catch(() => {})
        throw error
      }
    })
  }
}
