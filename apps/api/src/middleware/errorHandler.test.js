import assert from 'node:assert/strict'
import test from 'node:test'
import { errorHandler } from './errorHandler.js'

const callErrorHandler = (error, request = { headers: {} }) => {
  let response
  const res = {
    status(status) {
      response = { status }
      return this
    },
    json(body) {
      response.body = body
      return this
    },
  }
  const originalError = console.error
  console.error = () => {}
  try {
    errorHandler(error, request, res, () => {})
  } finally {
    console.error = originalError
  }
  return response
}

test('hides internal error details and includes a request id', () => {
  const result = callErrorHandler(new Error('database connection string leaked'))
  assert.equal(result.status, 500)
  assert.equal(result.body.error, 'Internal Server Error')
  assert.ok(result.body.requestId)
})

test('preserves expected client errors and provided request ids', () => {
  const result = callErrorHandler(Object.assign(new Error('Invalid input'), { status: 400 }), {
    id: 'request-123',
    headers: {},
  })
  assert.equal(result.status, 400)
  assert.equal(result.body.error, 'Invalid input')
  assert.equal(result.body.requestId, 'request-123')
})

test('does not log Axios request config that may contain a Telegram bot token', () => {
  const token = '123456789:example-secret-token'
  const error = Object.assign(new Error('timeout of 8000ms exceeded'), {
    name: 'AxiosError',
    code: 'ECONNABORTED',
    config: { url: `https://api.telegram.org/bot${token}/setMyCommands` },
  })
  const request = {
    headers: {},
    method: 'POST',
    originalUrl: '/api/v1/integrations/telegram/commands',
  }
  const res = {
    status() {
      return this
    },
    json() {},
  }
  const originalError = console.error
  let logged = ''
  console.error = (...args) => {
    logged = JSON.stringify(args)
  }
  try {
    errorHandler(error, request, res, () => {})
  } finally {
    console.error = originalError
  }
  assert.equal(logged.includes(token), false)
})
