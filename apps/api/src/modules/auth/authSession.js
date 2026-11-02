import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../../middleware/auth.js'
import { AuthSession, User } from '../../models/index.js'
import {
  createCsrfToken,
  createSessionSecrets,
  hashSecret,
  isValidCsrfToken,
  readCookie,
  setAuthCookies,
} from '../../utils/authCookies.js'

const ACCESS_TOKEN_TTL = '15m'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const TOKEN_ISSUER = 'lubrix-api'
const TOKEN_AUDIENCE = 'lubrix-app'

const signAccessToken = (user, sessionId) =>
  jwt.sign(
    {
      userId: user._id.toString(),
      organizationId: user.organizationId,
      role: user.role,
      name: user.name,
      sessionId: String(sessionId),
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_TTL,
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    }
  )

export const createAuthSession = async (user, req) => {
  const secrets = createSessionSecrets()
  const session = await AuthSession.create({
    userId: user._id.toString(),
    organizationId: user.organizationId,
    refreshTokenHash: hashSecret(secrets.refreshToken),
    csrfTokenHash: hashSecret(secrets.csrfToken),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    ipAddress: String(req.ip || '').slice(0, 80),
  })

  return {
    accessToken: signAccessToken(user, session._id),
    ...secrets,
    session,
  }
}

export const issueAuthSession = async (res, user, req) => {
  const credentials = await createAuthSession(user, req)
  setAuthCookies(res, credentials)
  return credentials
}

export const rotateCsrfToken = async (session) => {
  const csrfToken = createCsrfToken()
  session.csrfTokenHash = hashSecret(csrfToken)
  await session.save()
  return csrfToken
}

export const authenticateAccessToken = async (accessToken) => {
  if (!accessToken) return null
  let claims
  try {
    claims = jwt.verify(accessToken, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    })
  } catch {
    return null
  }
  if (!claims.sessionId || !claims.userId || !claims.organizationId) return null

  const [session, user] = await Promise.all([
    AuthSession.findOne({
      _id: claims.sessionId,
      userId: claims.userId,
      organizationId: claims.organizationId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).select('_id userId organizationId csrfTokenHash'),
    User.findOne({
      _id: claims.userId,
      organizationId: claims.organizationId,
      isActive: true,
    }).select('_id name email role organizationId branchId phone avatarUrl'),
  ])
  if (!session || !user) return null
  return { claims, session, user }
}

export const rotateRefreshSession = async (refreshToken, req) => {
  if (!refreshToken) return null
  const oldHash = hashSecret(refreshToken)
  const now = new Date()
  const session = await AuthSession.findOne({
    refreshTokenHash: oldHash,
    revokedAt: null,
    expiresAt: { $gt: now },
  })

  if (!session) {
    const replayed = await AuthSession.findOne({
      usedRefreshTokenHashes: oldHash,
      revokedAt: null,
    }).select('userId organizationId')
    if (replayed) {
      const activeSessions = await AuthSession.find({
        userId: replayed.userId,
        organizationId: replayed.organizationId,
        revokedAt: null,
      }).select('_id')
      await AuthSession.updateMany(
        { userId: replayed.userId, organizationId: replayed.organizationId, revokedAt: null },
        { $set: { revokedAt: now } }
      )
      return { revoked: true, sessionIds: activeSessions.map((item) => item._id.toString()) }
    }
    return { revoked: false, sessionIds: [] }
  }
  if (
    !isValidCsrfToken(
      readCookie(req, 'lubrix_csrf'),
      req.headers['x-csrf-token'],
      session.csrfTokenHash
    )
  ) {
    return { csrfInvalid: true }
  }

  const user = await User.findOne({
    _id: session.userId,
    organizationId: session.organizationId,
    isActive: true,
  }).select('_id name email role organizationId branchId phone avatarUrl')
  if (!user) {
    session.revokedAt = now
    await session.save()
    return null
  }

  const secrets = createSessionSecrets()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  const rotated = await AuthSession.findOneAndUpdate(
    { _id: session._id, refreshTokenHash: oldHash, revokedAt: null, expiresAt: { $gt: now } },
    {
      $set: {
        refreshTokenHash: hashSecret(secrets.refreshToken),
        csrfTokenHash: hashSecret(secrets.csrfToken),
        expiresAt,
        lastUsedAt: now,
        userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
        ipAddress: String(req.ip || '').slice(0, 80),
      },
      $addToSet: { usedRefreshTokenHashes: oldHash },
    },
    { returnDocument: 'after' }
  )
  if (!rotated) {
    await AuthSession.updateMany(
      { userId: session.userId, organizationId: session.organizationId, revokedAt: null },
      { $set: { revokedAt: now } }
    )
    return null
  }

  return {
    user,
    session: rotated,
    accessToken: signAccessToken(user, rotated._id),
    ...secrets,
  }
}

export const revokeRefreshSession = async (refreshToken, req) => {
  if (!refreshToken) return { revoked: false, sessionIds: [] }
  const now = new Date()
  const hash = hashSecret(refreshToken)
  const session = await AuthSession.findOne({ refreshTokenHash: hash, revokedAt: null })
  if (session) {
    if (
      !isValidCsrfToken(
        readCookie(req, 'lubrix_csrf'),
        req.headers['x-csrf-token'],
        session.csrfTokenHash
      )
    ) {
      return { csrfInvalid: true, sessionIds: [] }
    }
    session.revokedAt = now
    await session.save()
    return { revoked: true, sessionIds: [session._id.toString()] }
  }

  const replayed = await AuthSession.findOne({
    usedRefreshTokenHashes: hash,
    revokedAt: null,
  }).select('userId organizationId')
  if (replayed) {
    const activeSessions = await AuthSession.find({
      userId: replayed.userId,
      organizationId: replayed.organizationId,
      revokedAt: null,
    }).select('_id')
    await AuthSession.updateMany(
      { userId: replayed.userId, organizationId: replayed.organizationId, revokedAt: null },
      { $set: { revokedAt: now } }
    )
    return { revoked: true, sessionIds: activeSessions.map((item) => item._id.toString()) }
  }
  return { revoked: false, sessionIds: [] }
}

export const isValidCsrfRequest = (req, session) => {
  const csrfCookie = readCookie(req, 'lubrix_csrf')
  const csrfHeader = req.headers['x-csrf-token']
  return Boolean(session && isValidCsrfToken(csrfCookie, csrfHeader, session.csrfTokenHash))
}
