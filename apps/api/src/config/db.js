import mongoose from 'mongoose'
import net from 'net'
import { startEmbeddedMongo } from './embeddedMongo.js'

const isPortListening = (port, host = '127.0.0.1') => {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(200)
    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.on('error', () => {
      resolve(false)
    })
    socket.connect(port, host)
  })
}

export const connectDB = async () => {
  const customURI = process.env.MONGODB_URI

  if (!customURI) {
    const isListening = await isPortListening(27017)
    if (!isListening) {
      console.log(
        '[LUBRIX MONGODB] Local port 27017 inactive. Starting embedded MongoDB instance...'
      )
      try {
        await startEmbeddedMongo(27017)
        console.log('[LUBRIX MONGODB] Embedded instance listening on 127.0.0.1:27017')
      } catch (e) {
        console.warn('[LUBRIX MONGODB] Note starting embedded:', e.message)
      }
    }
  }

  const mongoURI = customURI || 'mongodb://127.0.0.1:27017/lubrix_crm'
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000,
      directConnection: true,
    })
    console.log(`[LUBRIX MONGODB] Connected successfully: ${conn.connection.host}`)
    return true
  } catch (error) {
    console.warn(`[LUBRIX MONGODB] Connection warning: ${error.message}`)
    return false
  }
}
