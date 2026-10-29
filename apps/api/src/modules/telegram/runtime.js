import axios from 'axios'
import { TelegramIntegration } from '../../models/index.js'
import { TelegramService } from './telegramService.js'

const pollingStops = new Map()

async function setWebhook(integration) {
  const publicUrl = process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL
  if (!publicUrl) return false
  const url = `${publicUrl.replace(/\/$/, '')}/api/v1/integrations/telegram/webhook/${integration.organizationId}`
  await axios.post(
    `https://api.telegram.org/bot${integration.botToken}/setWebhook`,
    { url },
    { timeout: 8000 }
  )
  return true
}

async function pollOnce(integration) {
  const offset = (integration.lastUpdateId || 0) + 1
  const res = await axios.get(`https://api.telegram.org/bot${integration.botToken}/getUpdates`, {
    params: { offset, timeout: 20, allowed_updates: ['message'] },
    timeout: 25000,
  })
  const updates = res.data?.result || []
  let lastId = integration.lastUpdateId || 0
  for (const update of updates) {
    lastId = Math.max(lastId, update.update_id)
    await TelegramService.handleWebhookUpdate(integration.organizationId, update)
  }
  if (lastId !== (integration.lastUpdateId || 0)) {
    await TelegramIntegration.updateOne(
      { _id: integration._id },
      { $set: { lastUpdateId: lastId, lastSyncedAt: new Date(), lastError: null } }
    )
    integration.lastUpdateId = lastId
  }
}

function startPolling(integration) {
  const key = integration.organizationId
  if (pollingStops.get(key)) return

  let stopped = false
  pollingStops.set(key, () => {
    stopped = true
  })

  const loop = async () => {
    while (!stopped) {
      try {
        const fresh = await TelegramIntegration.findOne({
          organizationId: key,
          isActive: true,
        })
        if (!fresh) break
        await pollOnce(fresh)
      } catch (err) {
        await TelegramIntegration.updateOne(
          { organizationId: key },
          { $set: { lastError: err.message } }
        )
        await new Promise((r) => setTimeout(r, 4000))
      }
    }
    pollingStops.delete(key)
  }

  loop()
}

export function stopTelegramPolling(organizationId) {
  const stop = pollingStops.get(organizationId)
  if (stop) stop()
}

export async function activateTelegramBot(integration) {
  stopTelegramPolling(integration.organizationId)
  await TelegramService.ensureDefaultCommands(integration.organizationId)
  try {
    const usedWebhook = await setWebhook(integration)
    if (usedWebhook) {
      console.log(`[LUBRIX TELEGRAM] Webhook ulandi: ${integration.botUsername}`)
      return
    }
  } catch (err) {
    console.warn('[LUBRIX TELEGRAM] Webhook o‘rnatilmadi, polling ishlatiladi:', err.message)
  }

  try {
    await axios.post(`https://api.telegram.org/bot${integration.botToken}/deleteWebhook`, {
      drop_pending_updates: false,
    })
  } catch {
    // ignore
  }
  startPolling(integration)
  console.log(`[LUBRIX TELEGRAM] Polling boshlandi: @${integration.botUsername || integration.organizationId}`)
}

export async function startTelegramRuntime() {
  const integrations = await TelegramIntegration.find({ isActive: true })
  for (const integ of integrations) {
    try {
      await activateTelegramBot(integ)
    } catch (err) {
      console.warn(`[LUBRIX TELEGRAM] ${integ.botUsername} ishga tushmadi:`, err.message)
    }
  }
}
