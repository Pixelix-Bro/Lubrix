import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCustomerUpdates } from './controller.js'

test('normalizes supported customer fields and phone numbers', () => {
  assert.deepEqual(
    buildCustomerUpdates({ fullName: '  Ali Valiyev ', phone: '90 123 45 67', email: ' a@b.uz ' }),
    { fullName: 'Ali Valiyev', email: 'a@b.uz', phoneE164: '+998901234567' }
  )
})

test('does not allow tenant, relationship, or consent fields to be mass-assigned', () => {
  assert.deepEqual(
    buildCustomerUpdates({
      organizationId: 'other-organization',
      _id: 'other-customer',
      smsConsentAt: new Date(0),
      optedOutAt: null,
      customerType: 'REGULAR',
    }),
    { customerType: 'REGULAR' }
  )
})

test('records SMS consent only from the explicit consent action', () => {
  const updates = buildCustomerUpdates({ smsConsent: true })

  assert.equal(updates.smsConsentSource, 'OPERATOR_RECORDED')
  assert.equal(updates.smsConsentAt instanceof Date, true)
  assert.equal(updates.optedOutAt, null)
})

test('records an opt-out when SMS consent is removed', () => {
  const updates = buildCustomerUpdates({ smsConsent: false })

  assert.equal(updates.smsConsentAt, null)
  assert.equal(updates.smsConsentSource, null)
  assert.equal(updates.optedOutAt instanceof Date, true)
})
