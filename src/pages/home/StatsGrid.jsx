import {
  BarChart2,
  CalendarDays,
  Car,
  CircleDollarSign,
  Clock3,
  Settings2,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import StatsCard from '../../components/ui/StatsCard';

/**
 * StatsGrid — Dashboard KPI kartalar
 */
export default function StatsGrid({ dashboardData, servicesCount, remindersCount, loading }) {
  const theme = useSelector((s) => s.themes.theme);

  const todayRevenue    = dashboardData?.today?.revenue      || 0;
  const todayServices   = dashboardData?.today?.services     || 0;
  const totalCustomers  = dashboardData?.total?.customers    || 0;
  const totalVehicles   = dashboardData?.total?.vehicles     || 0;
  const monthRevenue    = dashboardData?.month?.revenue      || 0;
  const overdueCount    = dashboardData?.upcoming?.overdue   || 0;

  const cards = [
    {
      icon:  <CircleDollarSign size={20} />,
      label: "Bugungi Daromad",
      value: `${todayRevenue.toLocaleString()} UZS`,
      delta: "+12.5%",
      positive: true,
      sub:   `Oylik: ${monthRevenue.toLocaleString()} UZS`,
      color: 'blue',
      to:    '/reports',
    },
    {
      icon:  <Settings2 size={20} />,
      label: "Bugungi Xizmatlar",
      value: `${todayServices} ta`,
      delta: "+3 ta",
      positive: true,
      sub:   `Jami: ${servicesCount} ta`,
      color: 'emerald',
      to:    '/services',
    },
    {
      icon:  <UsersRound size={20} />,
      label: "Mijozlar",
      value: `${totalCustomers} ta`,
      delta: "+2 ta",
      positive: true,
      sub:   `Bugun yangi: ${dashboardData?.today?.newCustomers || 0}`,
      color: 'purple',
      to:    '/customers',
    },
    {
      icon:  <Car size={20} />,
      label: "Avtomobillar",
      value: `${totalVehicles} ta`,
      delta: "+1 ta",
      positive: true,
      color: 'amber',
      to:    '/vehicles',
    },
    {
      icon:  <Clock3 size={20} />,
      label: "Muddati O'tgan",
      value: `${overdueCount} ta`,
      delta: overdueCount > 0 ? `${overdueCount} ta` : '0 ta',
      positive: overdueCount === 0,
      sub:   "Eslatma yuborilishi kerak",
      color: 'rose',
      to:    '/reminders',
    },
    {
      icon:  <BarChart2 size={20} />,
      label: "Aktiv Eslatmalar",
      value: `${remindersCount} ta`,
      color: 'blue',
      to:    '/reminders',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`p-4 rounded-2xl border animate-pulse h-28 ${
              theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Link key={card.label} to={card.to}>
          <StatsCard {...card} />
        </Link>
      ))}
    </div>
  );
}
