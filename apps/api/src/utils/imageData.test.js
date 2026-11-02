import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidImageDataUrl } from './imageData.js'

test('allows supported image data URLs', () => {
  assert.equal(isValidImageDataUrl('data:image/jpeg;base64,YWJj'), true)
  assert.equal(isValidImageDataUrl('data:image/png;base64,YWJj'), true)
  assert.equal(isValidImageDataUrl('data:image/webp;base64,YWJj'), true)
})

test('rejects non-image and oversized data URLs', () => {
  assert.equal(isValidImageDataUrl('data:text/html;base64,YWJj'), false)
  assert.equal(isValidImageDataUrl(`data:image/jpeg;base64,${'A'.repeat(2_100_000)}`), false)
})
