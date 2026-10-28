import { BarChart2, CircleDollarSign, Clock, TrendingUp, Users } from 'lucide-react';
import StatsCard from '../../components/ui/StatsCard';

/**
 * ReportsStatsGrid — hisobot KPI kartalar
 */
export default function ReportsStatsGrid({ stats = {}, reminders = [] }) {
  const {
    totalRevenue  = 0,
    yearRevenue   = 0,
    avgTicket     = 0,
    totalServices = 0,
    totalCustomers = 0,
    sentReminders  = 0,
    totalReminders = 0,
  } = stats;

  const sentRate  = totalReminders > 0 ? Math.round((sentReminders / totalReminders) * 100) : 0;

  const cards = [
    {
      icon:  <TrendingUp  size={20} />,
      label: "Jami Tushum",
      value: `${totalRevenue.toLocaleString()} UZS`,
      delta: "+14.2%",
      positive: true,
      color: 'blue',
    },
    {
      icon:  <CircleDollarSign size={20} />,
      label: "Yillik Tushum",
      value: `${yearRevenue.toLocaleString()} UZS`,
      color: 'emerald',
    },
    {
      icon:  <BarChart2 size={20} />,
      label: "O'rtacha Chek",
      value: `${avgTicket.toLocaleString()} UZS`,
      color: 'amber',
    },
    {
      icon:  <Users size={20} />,
      label: "Mijozlar",
      value: `${totalCustomers} ta`,
      sub:   `Takroriy tashriflar: 84%`,
      color: 'purple',
    },
    {
      icon:  <Clock size={20} />,
      label: "Eslatmalar Effekti",
      value: `${sentReminders} / ${totalReminders}`,
      sub:   `Yuborilish darajasi: ${sentRate}%`,
      color: 'amber',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <StatsCard key={c.label} {...c} />
      ))}
    </div>
  );
}
