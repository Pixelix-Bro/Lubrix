import { authenticateAccessToken, isValidCsrfRequest } from '../modules/auth/authSession.js'
import { readCookie } from '../utils/authCookies.js'

const DEVELOPMENT_JWT_SECRET = 'lubrix-dev-secret-change-in-production'

export const getJwtSecret = (env = process.env) => {
  const secret = env.JWT_SECRET?.trim()
  if (!secret) {
    if (env.NODE_ENV === 'production') {
      throw new Error('Production muhitida JWT_SECRET sozlanishi shart')
    }
    return DEVELOPMENT_JWT_SECRET
  }

  if (env.NODE_ENV === 'production' && Buffer.byteLength(secret) < 32) {
    throw new Error('Production JWT_SECRET kamida 32 bayt bo‘lishi shart')
  }

  return secret
}

export const JWT_SECRET = getJwtSecret()

export const requireAuth = async (req, res, next) => {
  try {
    const auth = await authenticateAccessToken(readCookie(req, 'lubrix_access'))
    if (!auth) {
      return res.status(401).json({
        success: false,
        error: 'Sessiya tugagan yoki yaroqsiz. Qayta kiring.',
        requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
      })
    }

    req.user = {
      userId: auth.user._id.toString(),
      id: auth.user._id.toString(),
      organizationId: auth.user.organizationId,
      role: auth.user.role,
      name: auth.user.name,
      branchId: auth.user.branchId,
    }
    req.userId = req.user.userId
    req.organizationId = auth.session.organizationId
    req.role = auth.user.role
    req.authSession = auth.session

    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
      !isValidCsrfRequest(req, auth.session)
    ) {
      return res.status(403).json({
        success: false,
        error: 'CSRF tekshiruvi o‘tmadi. Sahifani yangilab qayta urinib ko‘ring.',
      })
    }

    return next()
  } catch (error) {
    return next(error)
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
