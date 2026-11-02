import bcrypt from 'bcryptjs'
import { AuthSession, Organization, User } from '../../models/index.js'
import { disconnectSession } from '../../realtime/socket.js'
import {
  clearAuthCookies,
  cookiePolicy,
  createCsrfToken,
  hashSecret,
  isValidCsrfToken,
  readCookie,
  setAuthCookies,
} from '../../utils/authCookies.js'
import { issueAuthSession, revokeRefreshSession, rotateRefreshSession } from './authSession.js'

export const register = async (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Akkaunt faqat to‘lov provayderi tasdiqlagan checkout orqali yaratiladi.',
  })
}

export const login = async (req, res, next) => {
  try {
    const csrfCookie = readCookie(req, 'lubrix_csrf')
    if (!isValidCsrfToken(csrfCookie, req.headers['x-csrf-token'], hashSecret(csrfCookie || ''))) {
      return res.status(403).json({ success: false, error: 'CSRF tekshiruvi o‘tmadi' })
    }
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email va parol kiritilishi shart',
      })
    }

    const cleanEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: cleanEmail })
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Noto‘g‘ri login yoki parol',
      })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Noto‘g‘ri login yoki parol',
      })
    }

    const org = await Organization.findById(user.organizationId)
    if (!org) {
      return res.status(409).json({
        success: false,
        error: 'Foydalanuvchining tashkilot ma’lumoti topilmadi. Administrator bilan bog‘laning.',
      })
    }

    user.lastLogin = new Date()
    await user.save()

    const session = await issueAuthSession(res, user, req)

    res.json({
      success: true,
      csrfToken: session.csrfToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        branchId: user.branchId,
        phone: user.phone,
      },
      organization: {
        id: org._id,
        name: org.name,
        slug: org.slug,
        currency: org.currency,
        settings: org.settings,
      },
    })
  } catch (err) {
    next(err)
  }
}

export const refresh = async (req, res, next) => {
  try {
    const result = await rotateRefreshSession(readCookie(req, 'lubrix_refresh'), req)
    if (result?.csrfInvalid) {
      return res.status(403).json({ success: false, error: 'CSRF tekshiruvi o‘tmadi' })
    }
    if (!result || !result.user) {
      clearAuthCookies(res)
      return res.status(401).json({ success: false, error: 'Sessiya tugagan. Qayta kiring.' })
    }
    setAuthCookies(res, result)
    res.json({
      success: true,
      csrfToken: result.csrfToken,
      user: {
        id: result.user._id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        organizationId: result.user.organizationId,
        branchId: result.user.branchId,
        phone: result.user.phone,
        avatarUrl: result.user.avatarUrl,
      },
    })
  } catch (err) {
    next(err)
  }
}

export const logout = async (req, res, next) => {
  try {
    const refreshToken = readCookie(req, 'lubrix_refresh')
    const result = await revokeRefreshSession(refreshToken, req)
    if (result.csrfInvalid) {
      return res.status(403).json({ success: false, error: 'CSRF tekshiruvi o‘tmadi' })
    }
    for (const sessionId of result.sessionIds) disconnectSession(sessionId)
    clearAuthCookies(res)
    res.json({
      success: true,
      revoked: result.revoked,
      message: 'Muvaffaqiyatli tizimdan chiqildi',
    })
  } catch (err) {
    next(err)
  }
}

export const getCsrfToken = (req, res) => {
  let csrfToken = readCookie(req, 'lubrix_csrf')
  if (!csrfToken) {
    csrfToken = createCsrfToken()
    res.cookie('lubrix_csrf', csrfToken, {
      ...cookiePolicy(),
      httpOnly: false,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
  }
  return res.json({ success: true, csrfToken })
}

export const me = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.userId, organizationId: req.organizationId })
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Foydalanuvchi topilmadi',
      })
    }

    const safeUser = user.toObject ? user.toObject() : { ...user }
    delete safeUser.passwordHash

    const org = await Organization.findById(req.organizationId)

    res.json({
      success: true,
      data: {
        user: safeUser,
        organization: org,
      },
      csrfToken: readCookie(req, 'lubrix_csrf'),
    })
  } catch (err) {
    next(err)
  }
}

export const listSessions = async (req, res, next) => {
  try {
    const sessions = await AuthSession.find({
      userId: req.userId,
      organizationId: req.organizationId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .select('_id createdAt lastUsedAt userAgent ipAddress expiresAt')
      .sort({ lastUsedAt: -1 })
      .limit(50)
      .lean()
    res.json({
      success: true,
      data: sessions.map((session) => ({
        ...session,
        isCurrent: String(session._id) === String(req.authSession._id),
      })),
    })
  } catch (err) {
    next(err)
  }
}

export const revokeSession = async (req, res, next) => {
  try {
    const session = await AuthSession.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId,
        organizationId: req.organizationId,
        revokedAt: null,
      },
      { $set: { revokedAt: new Date() } },
      { returnDocument: 'after' }
    )
    if (!session) return res.status(404).json({ success: false, error: 'Sessiya topilmadi' })
    disconnectSession(session._id.toString())
    res.json({ success: true, data: { revoked: true } })
  } catch (err) {
    next(err)
  }
}

export const checkoutRegister = async (req, res) => {
  return res.status(503).json({
    success: false,
    error: 'To‘lov provayderi sozlanmagan. To‘lov tasdiqlanmaguncha akkaunt yaratilmaydi.',
  })
}
