import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyTelegramEditError,
  getTelegramEditMethod,
  isInlineKeyboardMarkup,
} from './telegramUi.js'

test('selects the edit method based on Telegram message type', () => {
  assert.equal(getTelegramEditMethod('photo'), 'editMessageCaption')
  assert.equal(getTelegramEditMethod('text'), 'editMessageText')
})

test('recognizes inline keyboard markup', () => {
  assert.equal(isInlineKeyboardMarkup({ inline_keyboard: [] }), true)
  assert.equal(isInlineKeyboardMarkup({ keyboard: [] }), false)
  assert.equal(isInlineKeyboardMarkup(undefined), false)
})

test('classifies unchanged edits, edit fallbacks, and unexpected failures', () => {
  assert.equal(
    classifyTelegramEditError(new Error('Bad Request: message is not modified')),
    'unchanged'
  )
  assert.equal(
    classifyTelegramEditError(new Error("Bad Request: message can't be edited")),
    'fallback'
  )
  assert.equal(classifyTelegramEditError(new Error('Forbidden: bot was blocked')), 'error')
})
