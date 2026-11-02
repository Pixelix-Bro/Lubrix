import assert from 'node:assert/strict'
import test from 'node:test'
import { litersToInventoryQuantity, parseOilQuantity } from './oilQuantity.js'

test('requires a finite positive oil quantity', () => {
  for (const value of [undefined, null, '', '  ', 'invalid', 0, 0.001, -1, Infinity]) {
    assert.equal(parseOilQuantity(value), null)
  }
})

test('preserves fractional liters', () => {
  assert.equal(parseOilQuantity('3.5'), 3.5)
  assert.equal(parseOilQuantity('4.25'), 4.25)
  assert.equal(parseOilQuantity('5.75'), 5.75)
})

test('converts liters to supported inventory volume units only', () => {
  assert.equal(litersToInventoryQuantity(4.25, 'L'), 4.25)
  assert.equal(litersToInventoryQuantity(4.25, 'ml'), 4250)
  assert.equal(litersToInventoryQuantity(4.25, 'piece'), null)
})
