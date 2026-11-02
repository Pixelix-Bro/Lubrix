import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveReportYear, summarizeRevenue, summarizeWeeklyRevenue } from './revenue.js'

test('includes one-time POS sales and does not double-count linked services', () => {
  const result = summarizeRevenue(
    [
      { _id: 'service-paid', price: 100 },
      { _id: 'service-unpaid', price: 50 },
    ],
    [
      { serviceId: 'service-paid', amount: 120, paymentStatus: 'PAID' },
      { serviceId: null, amount: 30, paymentStatus: 'PAID' },
      { serviceId: null, amount: 900, paymentStatus: 'PENDING' },
    ]
  )

  assert.deepEqual(result, { revenue: 200, sales: 3 })
})

test('attributes a linked service sale to its later payment period only', () => {
  const service = { _id: 'service-1', price: 100 }
  const payment = { serviceId: 'service-1', amount: 100, paymentStatus: 'PAID' }

  assert.deepEqual(summarizeRevenue([service], [], ['service-1']), { revenue: 0, sales: 0 })
  assert.deepEqual(summarizeRevenue([], [payment]), { revenue: 100, sales: 1 })
})

test('handles empty periods', () => {
  assert.deepEqual(summarizeRevenue(), { revenue: 0, sales: 0 })
})

test('limits report years to organization creation through current year', () => {
  assert.equal(resolveReportYear(undefined, 2026, 2024), 2026)
  assert.equal(resolveReportYear('2024', 2026, 2024), 2024)
  assert.equal(resolveReportYear('2023', 2026, 2024), null)
  assert.equal(resolveReportYear('2027', 2026, 2024), null)
  assert.equal(resolveReportYear('2026abc', 2026, 2024), null)
})

test('includes revenue from the previous month in a seven-day week', () => {
  const weekStart = new Date(2026, 8, 28)
  const weeklyData = summarizeWeeklyRevenue(
    [
      { _id: 'previous-month-service', price: 75, serviceDate: new Date(2026, 8, 30) },
      { _id: 'current-month-service', price: 100, serviceDate: new Date(2026, 9, 2) },
    ],
    [
      {
        serviceId: null,
        amount: 25,
        paymentStatus: 'PAID',
        paidAt: new Date(2026, 8, 29),
      },
    ],
    weekStart
  )

  assert.deepEqual(
    weeklyData.map(({ revenue }) => revenue),
    [0, 25, 75, 0, 100, 0, 0]
  )
})
