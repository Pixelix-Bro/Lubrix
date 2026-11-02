import { CalendarDays, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

import { translations } from '../../i18n/translations'
import { useGetHomeDashboardQuery } from '../../Redux/apiCache'
import { lubrixApi } from '../../services/api'
import { lubrixSocket } from '../../services/socket'

import RecentServicesTable from './RecentServicesTable'
import RemindersPanel from './RemindersPanel'
const EMPTY_ARRAY = []

import RevenueChart from './RevenueChart'
import StatsGrid from './StatsGrid'

const formatDate = (date, locale) => {
  const tag = { en: 'en-US', uz: 'uz-UZ', ru: 'ru-RU' }[locale] ?? 'uz-UZ'
  const s = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', weekday: 'long' }).format(
    date
  )
  return s.charAt(0).toLocaleUpperCase(tag) + s.slice(1)
}

export default function Home() {
  const theme = useSelector((s) => s.themes.theme)
  const locale = useSelector((s) => s.language.language)
  const authUser = useSelector((s) => s.auth?.user)
  const dict = translations[locale] || translations.uz

  const {
    data: homeData,
    isLoading: loading,
    refetch: fetchDashboard,
  } = useGetHomeDashboardQuery(undefined, { refetchOnMountOrArgChange: 60 })
  const dashboardData = homeData?.dashboard || null
  const services = homeData?.services || EMPTY_ARRAY
  const reminders = homeData?.reminders || EMPTY_ARRAY
  const [sendingReminderId, setSendingReminderId] = useState(null)
  const weeklyData = dashboardData?.weeklyData || []

  useEffect(() => {
    // Socket - tizim
    if (authUser?.organizationId) {
      lubrixSocket.setTenant(authUser.organizationId)
    }

    const u1 = lubrixSocket.subscribe('service:created', () => fetchDashboard())
    const u2 = lubrixSocket.subscribe('reminder:sent', () => fetchDashboard())
    const u3 = lubrixSocket.subscribe('dashboard:updated', () => fetchDashboard())
    return () => {
      u1()
      u2()
      u3()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // SMS yuborish
  const handleSendReminder = async (id) => {
    try {
      setSendingReminderId(id)
      await lubrixApi.sendReminderSms(id)
      await fetchDashboard()
    } catch (err) {
      console.error('[Home] sendReminder error:', err)
    } finally {
      setSendingReminderId(null)
    }
  }

  const now = new Date()
  const todayStr = formatDate(now, locale)

  const upcomingReminders = useMemo(
    () => reminders.filter((r) => r.status === 'scheduled'),
    [reminders]
  )

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide">
            {dict.ui.welcomeBack}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-1 mt-0.5">
            <CalendarDays size={13} />
            {todayStr}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/pos"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-blue-600 text-white text-sm font-semibold transition shadow-lg shadow-blue-500/20"
          >
            <Plus size={16} /> Yangi Xizmat
          </Link>
          <Link
            to="/reports"
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium border transition ${
              theme
                ? 'border-white/10 text-gray-300 hover:bg-white/5'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Hisobotlar <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <StatsGrid
        dashboardData={dashboardData}
        servicesCount={services.length}
        remindersCount={upcomingReminders.length}
        loading={loading}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart - 2/3 */}
        <div className="lg:col-span-2">
          <RevenueChart data={weeklyData} title="Haftalik Daromad & Xizmatlar" />
        </div>

        {/* Reminders Panel - 1/3 */}
        <RemindersPanel
          reminders={upcomingReminders}
          onSendSms={handleSendReminder}
          sendingId={sendingReminderId}
        />
      </div>

      {/* Recent Services Table */}
      <RecentServicesTable
        services={services}
        transactions={dashboardData?.recentTransactions || EMPTY_ARRAY}
        loading={loading}
      />
    </div>
  )
}
