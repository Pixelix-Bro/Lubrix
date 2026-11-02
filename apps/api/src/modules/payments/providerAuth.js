import crypto from 'node:crypto'

const timingSafeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))
  return (
    leftBuffer.length > 0 &&
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  )
}

export const isClickConfigured = (env = process.env) =>
  Boolean(env.CLICK_SERVICE_ID && env.CLICK_MERCHANT_ID && env.CLICK_SECRET_KEY)

export const verifyClickSignature = (body = {}, action, env = process.env) => {
  if (
    !isClickConfigured(env) ||
    !body.click_trans_id ||
    !body.merchant_trans_id ||
    !body.sign_time
  ) {
    return false
  }
  if (String(body.service_id) !== String(env.CLICK_SERVICE_ID)) return false

  const input = [
    body.click_trans_id,
    env.CLICK_SERVICE_ID,
    env.CLICK_SECRET_KEY,
    body.merchant_trans_id,
    body.amount,
    action,
    body.sign_time,
  ].join('')
  const expected = crypto.createHash('md5').update(input).digest('hex')
  return timingSafeEqual(body.sign_string, expected)
}

export const isPaymeConfigured = (env = process.env) =>
  Boolean(env.PAYME_MERCHANT_ID && env.PAYME_KEY)

export const canManuallyConfirmPosPayment = (provider) =>
  ['UZCARD', 'HUMO', 'TERMINAL'].includes(String(provider || '').toUpperCase())

export const verifyPaymeAuthorization = (authorization = '', env = process.env) => {
  if (!isPaymeConfigured(env) || !authorization.startsWith('Basic ')) return false
  const encoded = authorization.slice(6)
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return false
  const decoded = Buffer.from(encoded, 'base64').toString('utf8')
  return timingSafeEqual(decoded, `Paycom:${env.PAYME_KEY}`)
}
