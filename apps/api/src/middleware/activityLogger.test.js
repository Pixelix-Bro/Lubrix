import assert from 'node:assert/strict'
import test from 'node:test'
import {
  sanitizeAuditValue,
  shouldBroadcastActivity,
  shouldSkipActivity,
} from './activityLogger.js'

test('keeps profile updates in audit logs without broadcasting notifications', () => {
  const request = { originalUrl: '/api/v1/settings/profile' }
  assert.equal(shouldSkipActivity(request), false)
  assert.equal(shouldBroadcastActivity(request), false)
  assert.equal(
    shouldBroadcastActivity({ originalUrl: '/api/v1/settings/profile?tab=account' }),
    false
  )
})

test('keeps organization settings changes in the activity feed', () => {
  const request = { originalUrl: '/api/v1/settings' }
  assert.equal(shouldSkipActivity(request), false)
  assert.equal(shouldBroadcastActivity(request), true)
})

test('redacts personal and secret values recursively in audit summaries', () => {
  const safe = sanitizeAuditValue({
    organization: { email: 'private@example.uz', name: 'Private service' },
    integration: { botToken: 'secret-token', apiKey: 'secret-key' },
    phone: '+998901234567',
    latitude: 41.3,
    setting: 'dark',
  })

  assert.equal(safe.organization.email, '[yashirilgan]')
  assert.equal(safe.organization.name, '[yashirilgan]')
  assert.equal(safe.integration.botToken, '[yashirilgan]')
  assert.equal(safe.integration.apiKey, '[yashirilgan]')
  assert.equal(safe.phone, '[yashirilgan]')
  assert.equal(safe.latitude, '[yashirilgan]')
  assert.equal(safe.setting, 'dark')
})
