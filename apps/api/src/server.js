import 'dotenv/config'
import http from 'http'
import { app } from './app.js'
import { connectDB } from './config/db.js'
import { initSocket } from './realtime/socket.js'
import { startTelegramRuntime } from './modules/telegram/runtime.js'
import { checkSubscriptionAlerts } from './modules/notifications/subscriptionAlerts.js'

const PORT = process.env.PORT || 5000

async function start() {
  await connectDB()
  const server = http.createServer(app)
  initSocket(server)
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
}

start().catch(console.error)
