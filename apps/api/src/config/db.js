import mongoose from 'mongoose'
import net from 'net'
import { startEmbeddedMongo } from './embeddedMongo.js'

const TRANSIENT_MONGO_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENETUNREACH',
  'EAI_AGAIN',
  'ESERVFAIL',
])

export const isTransientMongoError = (error) =>
  TRANSIENT_MONGO_CODES.has(error?.code) || error?.name === 'MongooseServerSelectionError'

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const isPortListening = (port, host = '127.0.0.1') =>
  new Promise((resolve) => {
    const socket = new net.Socket()
    const done = (result) => {
      socket.destroy()
      resolve(result)
    }
    socket.setTimeout(200)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
    socket.connect(port, host)
  })

const waitForPort = async (port, attempts = 20, delay = 250) => {
  for (let i = 0; i < attempts; i++) {
    if (await isPortListening(port)) return true
    await new Promise((r) => setTimeout(r, delay))
  }
  return false
}

let listenersAttached = false
const attachListeners = () => {
  if (listenersAttached) return
  listenersAttached = true
  mongoose.connection.on('disconnected', () => console.warn('[LUBRIX MONGODB] Disconnected'))
  mongoose.connection.on('reconnected', () => console.log('[LUBRIX MONGODB] Reconnected'))
  mongoose.connection.on('error', (err) => console.error('[LUBRIX MONGODB] Error:', err.message))
}

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return true

  const configuredURI = process.env.MONGODB_URI?.trim()
  const localURI = 'mongodb://127.0.0.1:27017/lubrix_crm'
  attachListeners()

  const connectWith = async (uri, options, label) => {
    const conn = await mongoose.connect(uri, options)
    console.log(`[LUBRIX MONGODB] Connected (${label}): ${conn.connection.host}`)
    return true
  }

  if (configuredURI) {
    try {
      for (let attempt = 1; ; attempt += 1) {
        try {
          await connectWith(configuredURI, { serverSelectionTimeoutMS: 5000 }, 'configured')
          return true
        } catch (error) {
          if (!isTransientMongoError(error)) throw error
          await mongoose.disconnect().catch(() => {})
          const waitMs = Math.min(500 * 2 ** Math.min(attempt - 1, 5), 15000)
          console.warn(
            `[LUBRIX MONGODB] Temporary connection failure; retrying in ${waitMs}ms (attempt ${attempt + 1}).`
          )
          await delay(waitMs)
        }
      }
    } catch (error) {
      await mongoose.disconnect().catch(() => {})
      const causeMessage = String(error.message || 'unknown error').replace(
        /mongodb(?:\+srv)?:\/\/[^\s]+/gi,
        '[MongoDB URI]'
      )
      error.message = causeMessage
      delete error.connectionString
      delete error.uri
      delete error.options
      throw new Error(
        `Configured MongoDB is unavailable (${causeMessage}). Refusing to switch databases; check Atlas DNS/network and retry.`,
        { cause: error }
      )
    }
  }

  if (await isPortListening(27017)) {
    return connectWith(
      localURI,
      { serverSelectionTimeoutMS: 10000, directConnection: true },
      'local'
    )
  }

  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_EPHEMERAL_DB !== 'true') {
    throw new Error(
      'MONGODB_URI is required. The in-memory embedded database is available only in development with ALLOW_EPHEMERAL_DB=true.'
    )
  }

  console.warn(
    '[LUBRIX MONGODB] Starting explicitly enabled in-memory development database; all data is lost when the process stops.'
  )
  await startEmbeddedMongo(27017)
  if (!(await waitForPort(27017))) {
    throw new Error('Embedded MongoDB did not become ready in time')
  }
  return connectWith(
    localURI,
    { serverSelectionTimeoutMS: 10000, directConnection: true },
    'ephemeral-dev'
  )
}
