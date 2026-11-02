import assert from 'node:assert/strict'
import test from 'node:test'
import { validateAssistantQuestion, validatePlateImageData } from './controller.js'

test('trims valid assistant questions', () => {
  assert.deepEqual(validateAssistantQuestion('  Qanday qilib xizmat qo‘shaman?  '), {
    question: 'Qanday qilib xizmat qo‘shaman?',
  })
})

test('rejects empty, non-string, and oversized questions', () => {
  assert.equal(validateAssistantQuestion(' ').error, 'Savol kamida 2 ta belgidan iborat bo‘lsin.')
  assert.equal(
    validateAssistantQuestion({ text: 'test' }).error,
    'Savol matn ko‘rinishida bo‘lishi kerak.'
  )
  assert.equal(
    validateAssistantQuestion('a'.repeat(1201)).error,
    'Savol 1200 belgidan oshmasligi kerak.'
  )
})

test('accepts small supported image data and rejects other content or oversized input', () => {
  assert.equal(validatePlateImageData('data:image/jpeg;base64,YWJj').error, undefined)
  assert.equal(
    validatePlateImageData('data:text/plain;base64,YWJj').error,
    'Faqat JPEG, PNG yoki WebP rasm qabul qilinadi.'
  )
  assert.equal(
    validatePlateImageData(`data:image/jpeg;base64,${'A'.repeat(2_000_004)}`).error,
    'Rasm hajmi 1.5 MB dan oshmasligi kerak.'
  )
})
