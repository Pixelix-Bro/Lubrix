import http from 'http'
import { app } from './app.js'
import { getAllowedOrigins } from './config/cors.js'
import { connectDB } from './config/db.js'
import './config/env.js'
import { checkSubscriptionAlerts } from './modules/notifications/subscriptionAlerts.js'
import { startTelegramRuntime } from './modules/telegram/runtime.js'
import { initSocket } from './realtime/socket.js'

const PORT = process.env.PORT || 5000

async function start() {
  await connectDB()
  const server = http.createServer(app)
  initSocket(server, getAllowedOrigins())
  server.listen(PORT, () => {
    console.log(`[LUBRIX] Server running on port ${PORT}`)
  })
  try {
    await startTelegramRuntime()
  } catch (err) {
    console.warn('[LUBRIX TELEGRAM] Botni avtomatik ishga tushirishda xatolik:', err.message)
  }
  try {
    await checkSubscriptionAlerts()
  } catch (err) {
    console.warn('[LUBRIX PLAN] Obuna ogohlantirishida xatolik:', err.message)
  }
  const subscriptionAlertTimer = setInterval(
    () => {
      checkSubscriptionAlerts().catch((err) => {
        console.warn('[LUBRIX PLAN] Obuna ogohlantirishida xatolik:', err.message)
      })
    },
    6 * 60 * 60 * 1000
  )
  subscriptionAlertTimer.unref()
}

start().catch((error) => {
  console.error('[LUBRIX] Startup failed:', error.message)
  process.exitCode = 1
})
