import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const hashSecret = (value) => createHash('sha256').update(value).digest('hex')

export const createSessionSecrets = () => ({
  refreshToken: randomBytes(48).toString('base64url'),
  csrfToken: createCsrfToken(),
})

export const createCsrfToken = () => randomBytes(32).toString('base64url')

export const cookiePolicy = (env = process.env) => {
  const sameSite = String(env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase()
  if (!['strict', 'lax', 'none'].includes(sameSite)) {
    throw new Error('AUTH_COOKIE_SAME_SITE strict, lax yoki none bo‘lishi kerak')
  }
  const secure = env.NODE_ENV === 'production' || env.AUTH_COOKIE_SECURE === 'true'
  if (sameSite === 'none' && !secure) {
    throw new Error('SameSite=None cookie uchun Secure cookie talab qilinadi')
  }
  return { secure, sameSite }
}

export const setAuthCookies = (res, { accessToken, refreshToken, csrfToken }) => {
  const policy = cookiePolicy()
  const maxAge = 30 * 24 * 60 * 60 * 1000
  res.cookie('lubrix_access', accessToken, {
    ...policy,
    httpOnly: true,
    path: '/',
    maxAge: 15 * 60 * 1000,
  })
  res.cookie('lubrix_refresh', refreshToken, {
    ...policy,
    httpOnly: true,
    path: '/api/v1/auth',
    maxAge,
  })
  res.cookie('lubrix_csrf', csrfToken, {
    ...policy,
    httpOnly: false,
    path: '/',
    maxAge,
  })
}

export const clearAuthCookies = (res) => {
  const policy = cookiePolicy()
  res.clearCookie('lubrix_access', { ...policy, httpOnly: true, path: '/' })
  res.clearCookie('lubrix_refresh', { ...policy, httpOnly: true, path: '/api/v1/auth' })
  res.clearCookie('lubrix_csrf', { ...policy, httpOnly: false, path: '/' })
}

export const readCookie = (req, name) => {
  const cookies = String(req.headers.cookie || '').split(';')
  const entry = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`))
  if (!entry) return null
  try {
    return decodeURIComponent(entry.trim().slice(name.length + 1))
  } catch {
    return null
  }
}

export const safeTokenMatch = (provided, expectedHash) => {
  if (!provided || !expectedHash) return false
  const providedHash = Buffer.from(hashSecret(provided), 'hex')
  const storedHash = Buffer.from(expectedHash, 'hex')
  return providedHash.length === storedHash.length && timingSafeEqual(providedHash, storedHash)
}

export const isValidCsrfToken = (cookieToken, headerToken, expectedHash) =>
  safeTokenMatch(cookieToken, expectedHash) && safeTokenMatch(headerToken, expectedHash)
