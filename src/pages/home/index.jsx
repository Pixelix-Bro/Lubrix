import { CalendarDays, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { lubrixApi } from '../../services/api';
import { lubrixSocket } from '../../services/socket';
import { translations } from '../../i18n/translations';

import StatsGrid          from './StatsGrid';
import RevenueChart       from './RevenueChart';
import RemindersPanel     from './RemindersPanel';
import RecentServicesTable from './RecentServicesTable';

const formatDate = (date, locale) => {
  const tag = { en: 'en-US', uz: 'uz-UZ', ru: 'ru-RU' }[locale] ?? 'uz-UZ';
  const s   = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', weekday: 'long' }).format(date);
  return s.charAt(0).toLocaleUpperCase(tag) + s.slice(1);
};

export default function Home() {
  const theme     = useSelector((s) => s.themes.theme);
  const locale    = useSelector((s) => s.language.language);
  const authUser  = useSelector((s) => s.auth?.user);
  const dict      = translations[locale] || translations.uz;

  const [loading,          setLoading         ] = useState(true);
  const [dashboardData,    setDashboardData    ] = useState(null);
  const [services,         setServices         ] = useState([]);
  const [reminders,        setReminders         ] = useState([]);
  const [sendingReminderId, setSendingReminderId] = useState(null);

  // Oylik chart data (7 kun)
  const [weeklyData, setWeeklyData] = useState([]);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [aRes, sRes, rRes] = await Promise.all([
        lubrixApi.getDashboardAnalytics(),
        lubrixApi.getServices({ limit: 20 }),
        lubrixApi.getReminders(),
      ]);

      const dash = aRes.data?.data || null;
      setDashboardData(dash);
      setServices(sRes.data?.data  || []);
      setReminders(rRes.data?.data  || []);

      // Haqiqiy 7 kunlik chart data
      buildWeeklyData(sRes.data?.data || [], dash);
    } catch (err) {
      console.error('[Home] fetchDashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const buildWeeklyData = (svcs, dash) => {
    const days = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
    const now  = new Date();
    const data = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(d); dayEnd.setHours(23, 59, 59, 999);

      const daySvcs = svcs.filter((s) => {
        const sd = new Date(s.serviceDate || s.createdAt);
        return sd >= dayStart && sd <= dayEnd;
      });

      return {
        name:     days[d.getDay()],
        revenue:  daySvcs.reduce((acc, s) => acc + (Number(s.price) || 0), 0),
        services: daySvcs.length,
      };
    });
    setWeeklyData(data);
  };

  useEffect(() => {
    fetchDashboard();

    // Socket - tizim
    if (authUser?.organizationId) {
      lubrixSocket.setTenant(authUser.organizationId);
    }

    const u1 = lubrixSocket.subscribe('service:created',  () => fetchDashboard());
    const u2 = lubrixSocket.subscribe('reminder:sent',    () => fetchDashboard());
    const u3 = lubrixSocket.subscribe('dashboard:updated',() => fetchDashboard());
    return () => { u1(); u2(); u3(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SMS yuborish
  const handleSendReminder = async (id) => {
    try {
      setSendingReminderId(id);
      await lubrixApi.sendReminderSms(id);
      await fetchDashboard();
    } catch (err) {
      console.error('[Home] sendReminder error:', err);
    } finally {
      setSendingReminderId(null);
    }
  };

  const now       = new Date();
  const todayStr  = formatDate(now, locale);

  const upcomingReminders = useMemo(
    () => reminders.filter((r) => r.status === 'scheduled'),
    [reminders],
  );

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide">
            {dict.ui.welcomeBack} 👋
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
              theme ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
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
          <RevenueChart
            data={weeklyData}
            title="Haftalik Daromad & Xizmatlar"
          />
        </div>

        {/* Reminders Panel - 1/3 */}
        <RemindersPanel
          reminders={upcomingReminders}
          onSendSms={handleSendReminder}
          sendingId={sendingReminderId}
        />
      </div>

      {/* Recent Services Table */}
      <RecentServicesTable services={services} loading={loading} />
    </div>
  );
}
