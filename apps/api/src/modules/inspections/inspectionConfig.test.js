import assert from 'node:assert/strict'
import test from 'node:test'
import { INSPECTION_POINT_KEYS, validateInspectionPayload } from './inspectionConfig.js'

const validPayload = () => ({
  customerId: 'customer-1',
  vehicleId: 'vehicle-1',
  odometerKm: 42000,
  points: INSPECTION_POINT_KEYS.map((key) => ({
    key,
    status: 'NOT_CHECKED',
    note: '',
    recommendation: '',
  })),
})

test('requires every one of the 15 inspection points', () => {
  assert.equal(validateInspectionPayload(validPayload()), null)
  assert.match(validateInspectionPayload({ ...validPayload(), points: [] }), /15 ta/)
})

test('does not silently accept missing or unknown inspection statuses', () => {
  const payload = validPayload()
  payload.points[0].status = undefined
  assert.match(validateInspectionPayload(payload), /statusi noto‘g‘ri/)
  const unknownStatus = validPayload()
  unknownStatus.points[0].status = 'OK'
  assert.match(validateInspectionPayload(unknownStatus), /statusi noto‘g‘ri/)
})

test('rejects duplicate point keys and invalid odometer values', () => {
  const duplicate = validPayload()
  duplicate.points[1].key = duplicate.points[0].key
  assert.match(validateInspectionPayload(duplicate), /bir marta/)
  assert.match(validateInspectionPayload({ ...validPayload(), odometerKm: -1 }), /Probeg/)
})
