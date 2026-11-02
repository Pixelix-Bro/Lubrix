import assert from 'node:assert/strict'
import test from 'node:test'
import { parsePreferredBookingTime } from './bookingValidation.js'

const now = new Date('2026-10-30T00:00:00.000Z')

test('accepts a future preferred local date and time', () => {
  const result = parsePreferredBookingTime('2026-11-02 14:30', now)
  assert.equal(result.bookingDate.toISOString(), '2026-11-02T00:00:00.000Z')
  assert.equal(result.bookingTime, '14:30')
})

test('rejects malformed, impossible, and out-of-range date/time values', () => {
  assert.equal(parsePreferredBookingTime('not-a-date', now), null)
  assert.equal(parsePreferredBookingTime('2026-02-31 10:00', now), null)
  assert.equal(parsePreferredBookingTime('2026-11-02 24:10', now), null)
  assert.equal(parsePreferredBookingTime('2026-11-02 10:60', now), null)
})

test('rejects past and more-than-six-month preferred times', () => {
  assert.equal(parsePreferredBookingTime('2026-10-29 12:00', now), null)
  assert.equal(parsePreferredBookingTime('2027-05-01 12:00', now), null)
})
