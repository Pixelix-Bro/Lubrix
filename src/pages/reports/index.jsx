import { BarChart3, ChevronDown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { lubrixApi } from '../../services/api';

import ReportsStatsGrid from './ReportsStatsGrid';
import RevenueAreaChart from './RevenueAreaChart';
import OilBrandPieChart from './OilBrandPieChart';
import TransactionsTable from './TransactionsTable';

export default function Reports() {
  const theme = useSelector((s) => s.themes.theme);

  const [loading,   setLoading  ] = useState(true);
  const [data,      setData     ] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [year,      setYear     ] = useState(new Date().getFullYear());

  const load = async (y = year) => {
    try {
      setLoading(true);
      const [rRes, remRes] = await Promise.all([
        lubrixApi.getReports({ year: y }),
        lubrixApi.getReminders(),
      ]);
      setData(rRes.data?.data     || null);
      setReminders(remRes.data?.data || []);
    } catch (err) {
      console.error('[Reports] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const handleYearChange = (y) => {
    setYear(y);
    load(y);
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide flex items-center gap-2.5">
            <BarChart3 className="text-primary" size={24} />
            <span>Tahlil & Hisobotlar</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Servis daromadi, xizmatlar va mijozlar statistikasi
          </p>
        </div>

        {/* Yil tanlash */}
        <div className="relative">
          <select
            value={year}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className={`appearance-none pr-8 pl-4 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition ${
              theme
                ? 'border-white/10 bg-white/5 text-white'
                : 'border-gray-200 bg-white text-gray-800'
            }`}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}-yil</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={28} className="animate-spin text-primary mr-2" />
          <span className="text-sm">Hisobot ma'lumotlari yuklanmoqda...</span>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <ReportsStatsGrid stats={data?.stats || {}} reminders={reminders} />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 12 oy daromad grafigi */}
            <div
              className={`lg:col-span-2 p-5 rounded-2xl border ${
                theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
              }`}
            >
              <h2 className="text-base font-bold font-[title] mb-1">
                Daromad & Xizmatlar Dinamikasi
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                {year}-yil oylar kesimida avtoservis tushumi (UZS)
              </p>
              <RevenueAreaChart data={data?.monthlyData || []} />
            </div>

            {/* Moy markalari */}
            <div
              className={`p-5 rounded-2xl border ${
                theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
              }`}
            >
              <h2 className="text-base font-bold font-[title] mb-1">Moy Markalari Taqsimoti</h2>
              <p className="text-xs text-gray-400 mb-4">Eng ko'p ishlatilgan motor moylari</p>
              <OilBrandPieChart data={data?.brandData || []} />
            </div>
          </div>

          {/* Tranzaksiyalar */}
          <div
            className={`p-5 rounded-2xl border ${
              theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
            }`}
          >
            <div className="mb-4">
              <h2 className="text-base font-bold font-[title]">So'nggi Tranzaksiyalar Ro'yxati</h2>
              <p className="text-xs text-gray-400">Bajarilgan xizmatlar va ulardan olingan tushum</p>
            </div>
            <TransactionsTable services={data?.recentServices || []} />
          </div>
        </>
      )}
    </div>
  );
}
