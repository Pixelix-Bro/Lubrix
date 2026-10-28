import jwt from 'jsonwebtoken'

export const JWT_SECRET = process.env.JWT_SECRET || 'lubrix-dev-secret-change-in-production'

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Autentifikatsiya talab qilinadi. Token taqdim etilmagan.',
      requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
    })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    req.userId = decoded.userId || decoded.id
    req.organizationId = decoded.organizationId // Enforces tenant isolation
    req.role = decoded.role

    if (!req.organizationId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Token tarkibida tashkilot identifikatori mavjud emas',
      })
    }

    next()
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Noto‘g‘ri yoki muddati o‘tgan sessiya tokeni',
      requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
    })
  }
}

/**
 * Role-Based Access Control (RBAC) Guard
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Bu amalni bajarish uchun sizda ruxsat yo‘q',
      })
    }
    next()
  }
}

/**
 * Idempotency Key Enforcer
 */
export const enforceIdempotency = (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey
  if (!idempotencyKey && req.method === 'POST') {
    req.idempotencyKey = `lubrix:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`
  } else {
    req.idempotencyKey = idempotencyKey
  }
  next()
}
