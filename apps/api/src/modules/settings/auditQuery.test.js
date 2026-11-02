import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAuditQuery } from './auditQuery.js'

test('builds inclusive calendar-day filters as an exclusive next-day bound', () => {
  const result = buildAuditQuery({ from: '2026-11-02', to: '2026-11-02' })

  assert.equal(result.error, undefined)
  assert.equal(result.filter.createdAt.$gte.toISOString(), '2026-11-02T00:00:00.000Z')
  assert.equal(result.filter.createdAt.$lt.toISOString(), '2026-11-03T00:00:00.000Z')
})

test('rejects invalid and reversed audit date ranges', () => {
  assert.equal(buildAuditQuery({ from: 'not-a-date' }).error, 'Sana oralig‘i noto‘g‘ri.')
  assert.equal(
    buildAuditQuery({ from: '2026-11-03', to: '2026-11-02' }).error,
    'Tugash sanasi boshlanish sanasidan keyin bo‘lishi kerak.'
  )
})

test('caps page size and treats search input literally', () => {
  const result = buildAuditQuery({ limit: '500', search: 'a.*' })

  assert.equal(result.limit, 100)
  assert.equal(result.filter.$or[0].userName.test('a.*'), true)
  assert.equal(result.filter.$or[0].userName.test('anything'), false)
})
