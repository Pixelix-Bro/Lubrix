import assert from 'node:assert/strict'
import test from 'node:test'
import { getAllowedOrigins } from './cors.js'

test('uses explicit origins only in production', () => {
  assert.throws(
    () => getAllowedOrigins({ NODE_ENV: 'production' }),
    /CORS_ORIGINS allowlist sozlanishi shart/
  )
  assert.deepEqual(
    getAllowedOrigins({
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://app.example, https://admin.example',
    }),
    ['https://app.example', 'https://admin.example']
  )
})

test('allows local Vite development origins without wildcard access', () => {
  const origins = getAllowedOrigins({ NODE_ENV: 'development' })
  assert.ok(origins.includes('http://localhost:5173'))
  assert.ok(origins.includes('http://localhost:5174'))
  assert.ok(!origins.includes('*'))
})
