import { app } from './src/app.js'
import { connectDB } from './src/config/db.js'
import './src/config/env.js'

export default async function handler(req, res) {
  try {
    await connectDB()
    return app(req, res)
  } catch (error) {
    console.error('[LUBRIX] Request initialization failed:', error.message)
    return res.status(503).json({ success: false, error: 'Xizmat vaqtincha mavjud emas' })
  }
}
