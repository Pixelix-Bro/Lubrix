import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

class LubrixSocketService {
  constructor() {
    this.socket = null
  }

  setTenant() {
    return this.connect()
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      })

      this.socket.on('disconnect', () => {
        console.log('[Lubrix Realtime] Disconnected')
      })
    }
    return this.socket
  }

  subscribe(event, callback) {
    const socket = this.connect()
    if (!socket) return () => {}
    socket.on(event, callback)
    return () => {
      socket.off(event, callback)
    }
  }

  emit(event, data) {
    this.connect()?.emit(event, data)
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }
}

export const lubrixSocket = new LubrixSocketService()
