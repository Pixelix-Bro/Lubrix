import { Server } from 'socket.io'
import { getAllowedOrigins } from '../config/cors.js'
import { authenticateAccessToken } from '../modules/auth/authSession.js'
import { readCookie } from '../utils/authCookies.js'

let io = null

export const getTenantRoom = (authSession) =>
  authSession?.session?.organizationId ? `tenant:${authSession.session.organizationId}` : null

export const initRealtime = (server, allowedOrigins = getAllowedOrigins()) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
    allowRequest(request, callback) {
      const origin = request.headers.origin
      callback(null, !origin || allowedOrigins.includes(origin))
    },
  })

  io.use(async (socket, next) => {
    try {
      const session = await authenticateAccessToken(readCookie(socket.request, 'lubrix_access'))
      if (!session) return next(new Error('Authentication required'))
      socket.data.userId = session.user._id.toString()
      socket.data.organizationId = session.session.organizationId
      socket.data.sessionId = session.session._id.toString()
      socket.data.role = session.user.role
      socket.data.tenantRoom = getTenantRoom(session)
      return next()
    } catch {
      return next(new Error('Invalid authentication session'))
    }
  })

  io.on('connection', (socket) => {
    socket.join(socket.data.tenantRoom)
    socket.join(`session:${socket.data.sessionId}`)

    socket.on('disconnect', () => {
      // client disconnected
    })
  })

  return io
}

export const initSocket = initRealtime
export const createSocketServer = initRealtime

export const getIO = () => io

export const disconnectSession = (sessionId) => {
  if (io && sessionId) io.in(`session:${sessionId}`).disconnectSockets(true)
}

export const emitTenantEvent = (tenantId, event, data) => {
  if (io && tenantId) {
    io.to(`tenant:${tenantId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    })
  }
}

export const emitGlobalEvent = (event, data) => {
  if (io) {
    io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    })
  }
}
