import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSettingsUpdate } from './controller.js'

test('allows optional organization values to be cleared', () => {
  assert.deepEqual(
    buildSettingsUpdate({ organization: { phone: '', address: '   ', logoUrl: '' } }),
    { phone: '', address: '', logoUrl: '' }
  )
})

test('updates only provided settings without replacing other settings', () => {
  assert.deepEqual(
    buildSettingsUpdate({ settings: { workingDays: 'Dushanba - Juma', autoReminders: false } }),
    {
      'settings.workingDays': 'Dushanba - Juma',
      'settings.autoReminders': false,
    }
  )
})

test('ignores organization and settings fields outside the update allowlist', () => {
  assert.deepEqual(
    buildSettingsUpdate({
      organization: { subscriptionStatus: 'CANCELLED' },
      settings: { unexpectedKey: 'ignored' },
    }),
    {}
  )
})
