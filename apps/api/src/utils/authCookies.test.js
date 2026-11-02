import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cookiePolicy,
  createSessionSecrets,
  hashSecret,
  isValidCsrfToken,
  safeTokenMatch,
} from './authCookies.js'

test('creates independent high-entropy session secrets and hashes them', () => {
  const first = createSessionSecrets()
  const second = createSessionSecrets()
  assert.notEqual(first.refreshToken, second.refreshToken)
  assert.notEqual(first.csrfToken, second.csrfToken)
  assert.equal(safeTokenMatch(first.refreshToken, hashSecret(first.refreshToken)), true)
  assert.equal(safeTokenMatch('wrong', hashSecret(first.refreshToken)), false)
  const csrfHash = hashSecret(first.csrfToken)
  assert.equal(isValidCsrfToken(first.csrfToken, first.csrfToken, csrfHash), true)
  assert.equal(isValidCsrfToken(first.csrfToken, 'wrong', csrfHash), false)
})

test('requires secure cookies for production and SameSite=None', () => {
  assert.deepEqual(cookiePolicy({ NODE_ENV: 'production' }), { secure: true, sameSite: 'lax' })
  assert.throws(
    () => cookiePolicy({ AUTH_COOKIE_SAME_SITE: 'none' }),
    /Secure cookie talab qilinadi/
  )
  assert.deepEqual(cookiePolicy({ AUTH_COOKIE_SAME_SITE: 'none', AUTH_COOKIE_SECURE: 'true' }), {
    secure: true,
    sameSite: 'none',
  })
})
