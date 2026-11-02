import {
  Customer,
  Organization,
  Reminder,
  ServiceRecord,
  Transaction,
  Vehicle,
} from '../../models/index.js'
import { resolveReportYear, summarizeRevenue, summarizeWeeklyRevenue } from './revenue.js'

// ─── Dashboard: bugungi va oylik statistika ───────────────────────────────────
export const getDashboard = async (req, res, next) => {
  try {
    const orgId = req.organizationId
    const now = new Date()

    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)

    const [
      monthServices,
      monthTransactions,
      settledServiceIds,
      weekServices,
      weekTransactions,
      todayNewCustomers,
      totalCustomers,
      totalVehicles,
      totalServicesCount,
      upcomingReminders,
      overdueReminders,
      recentServices,
      remindersDue,
      recentTransactions,
    ] = await Promise.all([
      ServiceRecord.find({
        organizationId: orgId,
        serviceDate: { $gte: startOfMonth, $lte: endOfMonth },
      }).select('_id price serviceDate createdAt'),
      Transaction.find({
        organizationId: orgId,
        paymentStatus: 'PAID',
        paidAt: { $gte: startOfMonth, $lte: endOfMonth },
      }).select('serviceId amount paymentStatus paidAt'),
      Transaction.distinct('serviceId', { organizationId: orgId, paymentStatus: 'PAID' }),
      ServiceRecord.find({
        organizationId: orgId,
        serviceDate: { $gte: weekStart, $lte: endOfDay },
      }).select('_id price serviceDate createdAt'),
      Transaction.find({
        organizationId: orgId,
        paymentStatus: 'PAID',
        paidAt: { $gte: weekStart, $lte: endOfDay },
      }).select('serviceId amount paymentStatus paidAt'),
      Customer.countDocuments({
        organizationId: orgId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }),
      Customer.countDocuments({ organizationId: orgId }),
      Vehicle.countDocuments({ organizationId: orgId }),
      ServiceRecord.countDocuments({ organizationId: orgId }),
      Reminder.countDocuments({ organizationId: orgId, status: 'scheduled', dueAt: { $gte: now } }),
      Reminder.countDocuments({ organizationId: orgId, status: 'scheduled', dueAt: { $lt: now } }),
      ServiceRecord.find({ organizationId: orgId })
        .sort({ serviceDate: -1, createdAt: -1 })
        .limit(5),
      Reminder.find({ organizationId: orgId, status: 'scheduled' }).sort({ dueAt: 1 }).limit(5),
      Transaction.find({ organizationId: orgId, paymentStatus: 'PAID' })
        .sort({ paidAt: -1, createdAt: -1 })
        .limit(10)
        .select(
          'serviceId amount paymentStatus paidAt createdAt customerName provider receiptNumber items'
        ),
    ])

    const todayServices = monthServices.filter((service) => {
      const date = new Date(service.serviceDate || service.createdAt)
      return date >= startOfDay && date <= endOfDay
    })
    const todayTransactions = monthTransactions.filter((transaction) => {
      const date = new Date(transaction.paidAt)
      return date >= startOfDay && date <= endOfDay
    })
    const todaySummary = summarizeRevenue(todayServices, todayTransactions, settledServiceIds)
    const monthSummary = summarizeRevenue(monthServices, monthTransactions, settledServiceIds)
    const weeklyData = summarizeWeeklyRevenue(
      weekServices,
      weekTransactions,
      weekStart,
      settledServiceIds
    )

    res.json({
      success: true,
      data: {
        today: {
          services: todaySummary.sales,
          revenue: todaySummary.revenue,
          newCustomers: todayNewCustomers,
        },
        month: { services: monthSummary.sales, revenue: monthSummary.revenue },
        total: { customers: totalCustomers, vehicles: totalVehicles, services: totalServicesCount },
        upcoming: { reminders: upcomingReminders, overdue: overdueReminders },
        recentServices,
        remindersDue,
        weeklyData,
        recentTransactions,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── Overview: umumiy raqamlar ────────────────────────────────────────────────
export const getOverview = async (req, res, next) => {
  try {
    const orgId = req.organizationId
    const [services, paidTransactions, customersCount, vehiclesCount, pendingReminders] =
      await Promise.all([
        ServiceRecord.find({ organizationId: orgId }),
        Transaction.find({ organizationId: orgId, paymentStatus: 'PAID' }).select(
          'serviceId amount paymentStatus'
        ),
        Customer.countDocuments({ organizationId: orgId }),
        Vehicle.countDocuments({ organizationId: orgId }),
        Reminder.countDocuments({ organizationId: orgId, status: 'scheduled' }),
      ])

    const totalRevenue = summarizeRevenue(services, paidTransactions).revenue
    const completedServices = services.filter((s) => s.status === 'Tugallandi').length

    res.json({
      success: true,
      data: {
        totalRevenue,
        servicesCount: services.length,
        completedServices,
        customersCount,
        vehiclesCount,
        pendingReminders,
        stats: [
          {
            label: 'Jami tushum',
            value: `${totalRevenue.toLocaleString()} so'm`,
            delta: '',
            positive: true,
            icon: 'CircleDollarSign',
          },
          {
            label: 'Xizmatlar',
            value: `${services.length} ta`,
            delta: '',
            positive: true,
            icon: 'Settings2',
          },
          {
            label: 'Mijozlar',
            value: `${customersCount} ta`,
            delta: '',
            positive: true,
            icon: 'UsersRound',
          },
          {
            label: 'Kutilayotgan eslatmalar',
            value: `${pendingReminders} ta`,
            delta: '',
            positive: false,
            icon: 'Clock3',
          },
        ],
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── Reports: 12 oylik real daromad va xizmat statistikasi ───────────────────
export const getReports = async (req, res, next) => {
  try {
    const orgId = req.organizationId
    const now = new Date()
    const org = await Organization.findById(orgId)
    const startedYear = org?.createdAt ? new Date(org.createdAt).getFullYear() : now.getFullYear()
    const year = resolveReportYear(req.query.year, now.getFullYear(), startedYear)
    if (year === null) {
      return res.status(400).json({
        success: false,
        error: `Hisobot yili ${startedYear} va ${now.getFullYear()} oralig‘ida bo‘lishi kerak`,
      })
    }

    // 12 oy uchun: har oy servicelar
    const months = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(year, i, 1)
      const end = new Date(year, i + 1, 0, 23, 59, 59, 999)
      return { month: i, start, end }
    })

    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)
    const [yearServices, yearTransactions, allServices, allTransactions] = await Promise.all([
      ServiceRecord.find({
        organizationId: orgId,
        serviceDate: { $gte: yearStart, $lte: yearEnd },
      }).select('_id price serviceDate createdAt oilBrand'),
      Transaction.find({
        organizationId: orgId,
        paymentStatus: 'PAID',
        paidAt: { $gte: yearStart, $lte: yearEnd },
      }).select('serviceId amount paymentStatus paidAt'),
      ServiceRecord.find({ organizationId: orgId }).select('_id price oilBrand'),
      Transaction.find({ organizationId: orgId, paymentStatus: 'PAID' }).select(
        'serviceId amount paymentStatus'
      ),
    ])

    const UZ_MONTHS = [
      'Yan',
      'Fev',
      'Mar',
      'Apr',
      'May',
      'Iyun',
      'Iyul',
      'Avg',
      'Sep',
      'Okt',
      'Noy',
      'Dek',
    ]

    const servicesByMonth = Array.from({ length: 12 }, () => [])
    const transactionsByMonth = Array.from({ length: 12 }, () => [])
    for (const service of yearServices) {
      const month = new Date(service.serviceDate || service.createdAt).getMonth()
      if (month >= 0 && month < 12) servicesByMonth[month].push(service)
    }
    for (const transaction of yearTransactions) {
      const month = new Date(transaction.paidAt).getMonth()
      if (month >= 0 && month < 12) transactionsByMonth[month].push(transaction)
    }

    const settledServiceIds = allTransactions.map((transaction) => transaction.serviceId)
    const monthlyData = months.map((_, i) => {
      const services = servicesByMonth[i]
      const transactions = transactionsByMonth[i]
      const summary = summarizeRevenue(services, transactions, settledServiceIds)
      return { name: UZ_MONTHS[i], revenue: summary.revenue, services: summary.sales }
    })

    // Moy markalari taqsimoti
    const brandMap = {}
    for (const s of allServices) {
      if (s.oilBrand) {
        brandMap[s.oilBrand] = (brandMap[s.oilBrand] || 0) + 1
      }
    }
    const brandData = Object.entries(brandMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    // Umumiy statistika
    const allTimeSummary = summarizeRevenue(allServices, allTransactions)
    const totalRevenue = allTimeSummary.revenue
    const avgTicket = allTimeSummary.sales > 0 ? Math.round(totalRevenue / allTimeSummary.sales) : 0

    // Yil bo'yicha tushum
    const yearRevenue = summarizeRevenue(yearServices, yearTransactions, settledServiceIds).revenue

    // So'nggi xizmatlar
    const recentServices = await ServiceRecord.find({ organizationId: orgId })
      .sort({ serviceDate: -1, createdAt: -1 })
      .limit(20)

    // Eslatmalar statistikasi
    const [totalReminders, sentReminders, recentTransactions] = await Promise.all([
      Reminder.countDocuments({ organizationId: orgId }),
      Reminder.countDocuments({ organizationId: orgId, status: 'sent' }),
      Transaction.find({ organizationId: orgId, paymentStatus: 'PAID' })
        .sort({ paidAt: -1, createdAt: -1 })
        .limit(20)
        .select(
          'serviceId amount paymentStatus paidAt createdAt customerName provider receiptNumber items'
        ),
    ])

    // Mijozlar statistikasi
    const totalCustomers = await Customer.countDocuments({ organizationId: orgId })

    const years = []
    for (let y = startedYear; y <= now.getFullYear(); y += 1) years.push(y)

    res.json({
      success: true,
      data: {
        year,
        startedYear,
        years,
        monthlyData,
        brandData,
        stats: {
          totalRevenue,
          yearRevenue,
          avgTicket,
          totalServices: allServices.length,
          totalCustomers,
          sentReminders,
          totalReminders,
          returnRate:
            totalCustomers > 0
              ? Math.round((sentReminders / Math.max(totalCustomers, 1)) * 100)
              : 0,
        },
        recentServices,
        recentTransactions,
      },
    })
  } catch (err) {
    next(err)
  }
}
