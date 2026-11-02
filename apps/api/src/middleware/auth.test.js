import assert from 'node:assert/strict';
import test from 'node:test';
import { getJwtSecret } from './auth.js';

test('requires a JWT secret in production', () => {
  assert.throws(
    () => getJwtSecret({ NODE_ENV: 'production' }),
    /JWT_SECRET sozlanishi shart/
  )
})

test('rejects short production JWT secrets', () => {
  assert.throws(
    () => getJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'too-short' }),
    /kamida 32 bayt/
  )
})

test('accepts a sufficiently long production JWT secret', () => {
  const secret = 'a'.repeat(32)
  assert.equal(getJwtSecret({ NODE_ENV: 'production', JWT_SECRET: secret }), secret)
})

test('uses the development fallback outside production', () => {
  assert.equal(
    getJwtSecret({ NODE_ENV: 'development' }),
    'lubrix-dev-secret-change-in-production'
  )
})