import { AuditLog } from '../models/index.js'
import { emitTenantEvent } from '../realtime/socket.js'

export function activityLogger(req, res, next) {
  // Only track mutating operations
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (!mutatingMethods.includes(req.method)) {
    return next()
  }

  // Skip noisy endpoints or health checks
  if (req.originalUrl.includes('/health') || req.originalUrl.includes('/auth/login')) {
    return next()
  }

  res.on('finish', async () => {
    // Only log successful operations (2xx or 3xx)
    if (res.statusCode >= 200 && res.statusCode < 400) {
      try {
        const organizationId = req.organizationId || req.body?.organizationId || 'system'
        const userId = req.userId || req.user?._id?.toString() || 'anonymous'
        const userName = req.user?.name || req.body?.name || 'Foydalanuvchi'

        // Deduce human-friendly action & entity from method and path
        let entity = 'SYSTEM'
        let action = req.method

        const path = req.baseUrl || req.originalUrl || ''
        if (path.includes('/customers')) entity = 'CUSTOMER'
        else if (path.includes('/vehicles')) entity = 'VEHICLE'
        else if (path.includes('/services')) entity = 'SERVICE'
        else if (path.includes('/products') || path.includes('/inventory')) entity = 'INVENTORY'
        else if (path.includes('/reminders')) entity = 'REMINDER'
        else if (path.includes('/branches')) entity = 'BRANCH'
        else if (path.includes('/staff')) entity = 'STAFF'
        else if (path.includes('/settings')) entity = 'SETTINGS'
        else if (path.includes('/payments')) entity = 'PAYMENT'
        else if (path.includes('/telegram')) entity = 'TELEGRAM'

        if (req.method === 'POST') action = 'YARATILDI'
        else if (req.method === 'PUT' || req.method === 'PATCH') action = 'YANGILANDI'
        else if (req.method === 'DELETE') action = 'O‘CHIRILDI'

        const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1'

        // Sanitize body details (remove passwords or sensitive tokens)
        const safeBody = { ...req.body }
        delete safeBody.password
        delete safeBody.botToken
        delete safeBody.cardNumber

        const detailString =
          Object.keys(safeBody).length > 0
            ? JSON.stringify(safeBody).slice(0, 500)
            : `${entity} ${action.toLowerCase()}`

        const logEntry = await AuditLog.create({
          organizationId,
          userId,
          userName,
          action,
          entity,
          method: req.method,
          path: req.originalUrl,
          details: detailString,
          ipAddress: String(clientIp),
          userAgent: req.headers['user-agent'] || '',
        })

        // Broadcast to all active browsers of this organization in real-time
        if (organizationId && organizationId !== 'system') {
          emitTenantEvent(organizationId, 'ACTIVITY_LOGGED', {
            id: logEntry._id,
            action,
            entity,
            userName,
            details: detailString,
            createdAt: logEntry.createdAt,
          })
        }
      } catch (err) {
        // Silently handle audit log errors so request flow is never interrupted
        console.error('[ACTIVITY LOGGER ERROR]', err.message)
      }
    }
  })

  next()
}
