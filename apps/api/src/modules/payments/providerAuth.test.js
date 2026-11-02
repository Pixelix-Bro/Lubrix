import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import {
  canManuallyConfirmPosPayment,
  isClickConfigured,
  isPaymeConfigured,
  verifyClickSignature,
  verifyPaymeAuthorization,
} from './providerAuth.js'

const clickEnv = {
  CLICK_SERVICE_ID: 'service-1',
  CLICK_MERCHANT_ID: 'merchant-1',
  CLICK_SECRET_KEY: 'secret-1',
}

const signedClickBody = (action, overrides = {}) => {
  const body = {
    click_trans_id: 'click-1',
    service_id: clickEnv.CLICK_SERVICE_ID,
    merchant_trans_id: 'order-1',
    amount: '25000',
    sign_time: '2026-10-30 12:00:00',
    ...overrides,
  }
  const input = [
    body.click_trans_id,
    clickEnv.CLICK_SERVICE_ID,
    clickEnv.CLICK_SECRET_KEY,
    body.merchant_trans_id,
    body.amount,
    action,
    body.sign_time,
  ].join('')
  body.sign_string = crypto.createHash('md5').update(input).digest('hex')
  return body
}

test('requires all Click merchant credentials', () => {
  assert.equal(isClickConfigured({ CLICK_SERVICE_ID: '1' }), false)
})

test('only allows manual POS confirmation for physical terminal methods', () => {
  assert.equal(canManuallyConfirmPosPayment('UZCARD'), true)
  assert.equal(canManuallyConfirmPosPayment('HUMO'), true)
  assert.equal(canManuallyConfirmPosPayment('TERMINAL'), true)
  assert.equal(canManuallyConfirmPosPayment('CLICK'), false)
  assert.equal(canManuallyConfirmPosPayment('PAYME'), false)
})

test('accepts a valid Click signature and rejects changed payloads', () => {
  const body = signedClickBody(0)
  assert.equal(verifyClickSignature(body, 0, clickEnv), true)
  assert.equal(verifyClickSignature({ ...body, amount: '1' }, 0, clickEnv), false)
  assert.equal(verifyClickSignature(body, 1, clickEnv), false)
  assert.equal(verifyClickSignature({ ...body, service_id: 'other' }, 0, clickEnv), false)
})

test('requires configured Payme credentials and validates Basic auth', () => {
  const env = { PAYME_MERCHANT_ID: 'merchant-1', PAYME_KEY: 'secret-1' }
  const authorization = `Basic ${Buffer.from('Paycom:secret-1').toString('base64')}`
  assert.equal(isPaymeConfigured({ PAYME_KEY: 'secret-1' }), false)
  assert.equal(verifyPaymeAuthorization(authorization, env), true)
  assert.equal(verifyPaymeAuthorization('Basic bm90LXRoZS1zZWNyZXQ=', env), false)
  assert.equal(verifyPaymeAuthorization('Basic invalid!', env), false)
})
