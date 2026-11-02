import assert from 'node:assert/strict'
import test from 'node:test'
import { isTransientMongoError } from './db.js'

test('retries temporary DNS and network failures', () => {
  for (const code of ['ESERVFAIL', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT']) {
    assert.equal(isTransientMongoError({ code }), true)
  }
  assert.equal(isTransientMongoError({ name: 'MongooseServerSelectionError' }), true)
})

test('does not retry configuration or authentication errors', () => {
  assert.equal(isTransientMongoError({ code: 'ENOTFOUND' }), false)
  assert.equal(isTransientMongoError({ code: 8000, name: 'MongoServerError' }), false)
})
