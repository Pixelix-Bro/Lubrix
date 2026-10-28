import { Customer, Vehicle, ServiceRecord, Reminder } from '../../models/index.js';

// ─── Dashboard: bugungi va oylik statistika ───────────────────────────────────
export const getDashboard = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const now = new Date();

    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      todayServices,
      monthServices,
      todayNewCustomers,
      totalCustomers,
      totalVehicles,
      totalServicesCount,
      upcomingReminders,
      overdueReminders,
      recentServices,
      remindersDue,
    ] = await Promise.all([
      ServiceRecord.find({ organizationId: orgId, serviceDate: { $gte: startOfDay, $lte: endOfDay } }),
      ServiceRecord.find({ organizationId: orgId, serviceDate: { $gte: startOfMonth, $lte: endOfMonth } }),
      Customer.countDocuments({ organizationId: orgId, createdAt: { $gte: startOfDay, $lte: endOfDay } }),
      Customer.countDocuments({ organizationId: orgId }),
      Vehicle.countDocuments({ organizationId: orgId }),
      ServiceRecord.countDocuments({ organizationId: orgId }),
      Reminder.countDocuments({ organizationId: orgId, status: 'scheduled', dueAt: { $gte: now } }),
      Reminder.countDocuments({ organizationId: orgId, status: 'scheduled', dueAt: { $lt: now } }),
      ServiceRecord.find({ organizationId: orgId }).sort({ serviceDate: -1, createdAt: -1 }).limit(5),
      Reminder.find({ organizationId: orgId, status: 'scheduled' }).sort({ dueAt: 1 }).limit(5),
    ]);

    const todayRevenue = todayServices.reduce((s, r) => s + (Number(r.price) || 0), 0);
    const monthRevenue = monthServices.reduce((s, r) => s + (Number(r.price) || 0), 0);

    res.json({
      success: true,
      data: {
        today:    { services: todayServices.length, revenue: todayRevenue, newCustomers: todayNewCustomers },
        month:    { services: monthServices.length, revenue: monthRevenue },
        total:    { customers: totalCustomers, vehicles: totalVehicles, services: totalServicesCount },
        upcoming: { reminders: upcomingReminders, overdue: overdueReminders },
        recentServices,
        remindersDue,
      },
    });
  } catch (err) { next(err); }
};

// ─── Overview: umumiy raqamlar ────────────────────────────────────────────────
export const getOverview = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const [services, customersCount, vehiclesCount, pendingReminders] = await Promise.all([
      ServiceRecord.find({ organizationId: orgId }),
      Customer.countDocuments({ organizationId: orgId }),
      Vehicle.countDocuments({ organizationId: orgId }),
      Reminder.countDocuments({ organizationId: orgId, status: 'scheduled' }),
    ]);

    const totalRevenue       = services.reduce((a, c) => a + (Number(c.price) || 0), 0);
    const completedServices  = services.filter(s => s.status === 'Tugallandi').length;

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
          { label: 'Jami tushum',               value: `${totalRevenue.toLocaleString()} so'm`, delta: '+14.2%', positive: true,  icon: 'CircleDollarSign' },
          { label: 'Xizmatlar',                  value: `${services.length} ta`,                 delta: '+3 ta',   positive: true,  icon: 'Settings2'        },
          { label: 'Mijozlar',                   value: `${customersCount} ta`,                  delta: '+2 ta',   positive: true,  icon: 'UsersRound'       },
          { label: 'Kutilayotgan eslatmalar',    value: `${pendingReminders} ta`,                delta: '-1 ta',   positive: false, icon: 'Clock3'           },
        ],
      },
    });
  } catch (err) { next(err); }
};

// ─── Reports: 12 oylik real daromad va xizmat statistikasi ───────────────────
export const getReports = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const now   = new Date();
    const year  = parseInt(req.query.year) || now.getFullYear();

    // 12 oy uchun: har oy servicelar
    const months = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(year, i, 1);
      const end   = new Date(year, i + 1, 0, 23, 59, 59, 999);
      return { month: i, start, end };
    });

    const monthlyPromises = months.map(({ start, end }) =>
      ServiceRecord.find({
        organizationId: orgId,
        serviceDate: { $gte: start, $lte: end },
      })
    );

    const allMonthlyServices = await Promise.all(monthlyPromises);

    const UZ_MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sep', 'Okt', 'Noy', 'Dek'];

    const monthlyData = allMonthlyServices.map((services, i) => ({
      name:     UZ_MONTHS[i],
      revenue:  services.reduce((s, r) => s + (Number(r.price) || 0), 0),
      services: services.length,
    }));

    // Moy markalari taqsimoti
    const allServices = await ServiceRecord.find({ organizationId: orgId });
    const brandMap = {};
    for (const s of allServices) {
      if (s.oilBrand) {
        brandMap[s.oilBrand] = (brandMap[s.oilBrand] || 0) + 1;
      }
    }
    const brandData = Object.entries(brandMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Umumiy statistika
    const totalRevenue = allServices.reduce((s, r) => s + (Number(r.price) || 0), 0);
    const avgTicket    = allServices.length > 0 ? Math.round(totalRevenue / allServices.length) : 0;

    // Yil bo'yicha tushum
    const yearStart    = new Date(year, 0, 1);
    const yearEnd      = new Date(year, 11, 31, 23, 59, 59, 999);
    const yearServices = await ServiceRecord.find({
      organizationId: orgId,
      serviceDate: { $gte: yearStart, $lte: yearEnd },
    });
    const yearRevenue = yearServices.reduce((s, r) => s + (Number(r.price) || 0), 0);

    // So'nggi xizmatlar
    const recentServices = await ServiceRecord
      .find({ organizationId: orgId })
      .sort({ serviceDate: -1, createdAt: -1 })
      .limit(20);

    // Eslatmalar statistikasi
    const [totalReminders, sentReminders] = await Promise.all([
      Reminder.countDocuments({ organizationId: orgId }),
      Reminder.countDocuments({ organizationId: orgId, status: 'sent' }),
    ]);

    // Mijozlar statistikasi
    const totalCustomers = await Customer.countDocuments({ organizationId: orgId });

    res.json({
      success: true,
      data: {
        year,
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
          returnRate: totalCustomers > 0 ? Math.round((sentReminders / Math.max(totalCustomers, 1)) * 100) : 0,
        },
        recentServices,
      },
    });
  } catch (err) { next(err); }
};
