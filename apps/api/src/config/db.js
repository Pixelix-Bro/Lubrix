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
  console.log('MONGODB_URI:', customURI ? 'topildi' : 'TOPILMADI')

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
  const options = {
    serverSelectionTimeoutMS: 10000,
    ...(customURI ? {} : { directConnection: true }),
  }

  try {
    const conn = await mongoose.connect(mongoURI, options)
    console.log(`[LUBRIX MONGODB] Connected successfully: ${conn.connection.host}`)
    return true
  } catch (error) {
    console.error(`[LUBRIX MONGODB] Connection FAILED: ${error.message}`)
    return false
  }
}
