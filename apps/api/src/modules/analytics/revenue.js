export const summarizeRevenue = (services = [], transactions = [], settledServiceIds = []) => {
  const paidTransactions = transactions.filter(
    (transaction) => transaction.paymentStatus === 'PAID'
  )
  const settledServiceIdSet = new Set(
    [...paidTransactions.map((transaction) => transaction.serviceId), ...settledServiceIds]
      .map((serviceId) => String(serviceId || ''))
      .filter(Boolean)
  )
  const unlinkedServices = services.filter(
    (service) => !settledServiceIdSet.has(String(service._id))
  )

  return {
    revenue:
      unlinkedServices.reduce((total, service) => total + (Number(service.price) || 0), 0) +
      paidTransactions.reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0),
    sales: unlinkedServices.length + paidTransactions.length,
  }
}

export const summarizeWeeklyRevenue = (
  services = [],
  transactions = [],
  weekStart,
  settledServiceIds = []
) => {
  const weekdays = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan']

  return Array.from({ length: 7 }, (_, index) => {
    const dayStart = new Date(weekStart)
    dayStart.setDate(weekStart.getDate() + index)
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)
    const dayServices = services.filter((service) => {
      const date = new Date(service.serviceDate || service.createdAt)
      return date >= dayStart && date <= dayEnd
    })
    const dayTransactions = transactions.filter((transaction) => {
      const date = new Date(transaction.paidAt)
      return date >= dayStart && date <= dayEnd
    })
    const summary = summarizeRevenue(dayServices, dayTransactions, settledServiceIds)

    return {
      name: weekdays[dayStart.getDay()],
      revenue: summary.revenue,
      services: summary.sales,
    }
  })
}

export const resolveReportYear = (requestedYear, currentYear, startedYear) => {
  if (requestedYear === undefined || requestedYear === '') return currentYear
  if (!/^\d{4}$/.test(String(requestedYear))) return null

  const year = Number(requestedYear)
  return year >= startedYear && year <= currentYear ? year : null
}
