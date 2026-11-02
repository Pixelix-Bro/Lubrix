import { AuditLog } from '../models/index.js'
import { emitTenantEvent } from '../realtime/socket.js'

const SENSITIVE_FIELD =
  /(password|secret|token|api[_-]?key|authorization|cookie|card|cvv|email|phone|address|name|avatar|logo|message|notes|location|latitude|longitude)/i

export const sanitizeAuditValue = (value, key = '') => {
  if (SENSITIVE_FIELD.test(key)) return '[yashirilgan]'
  if (typeof value === 'string') {
    if (value.startsWith('data:') || value.length > 180) return `${key || 'qiymat'} yangilandi`
    return value
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeAuditValue(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 30)
        .map(([childKey, childValue]) => [childKey, sanitizeAuditValue(childValue, childKey)])
    )
  }
  return value
}

export const shouldSkipActivity = (req) => {
  const path = String(req.originalUrl || '').split('?')[0]
  return path.includes('/health') || path.includes('/auth/login')
}

export const shouldBroadcastActivity = (req) =>
  !String(req.originalUrl || '')
    .split('?')[0]
    .endsWith('/settings/profile')

export function activityLogger(req, res, next) {
  // Only track mutating operations
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (!mutatingMethods.includes(req.method)) {
    return next()
  }

  // Skip noisy endpoints or health checks
  if (shouldSkipActivity(req)) {
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

        const safeBody = sanitizeAuditValue(req.body || {})

        const detailString =
          Object.keys(safeBody).length > 0
            ? JSON.stringify(safeBody).slice(0, 280)
            : `${entity} ${action.toLowerCase()}`

        const logEntry = await AuditLog.create({
          organizationId,
          userId,
          userName,
          action,
          entity,
          entityId:
            res.locals?.auditEntityId || req.params?.id || req.body?.entityId || req.body?.id,
          method: req.method,
          path: req.originalUrl,
          details: detailString,
          ipAddress: String(clientIp),
          userAgent: req.headers['user-agent'] || '',
        })

        // Broadcast to all active browsers of this organization in real-time
        if (organizationId && organizationId !== 'system' && shouldBroadcastActivity(req)) {
          emitTenantEvent(organizationId, 'ACTIVITY_LOGGED', {
            id: logEntry._id,
            action,
            entity,
            entityId: logEntry.entityId,
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
