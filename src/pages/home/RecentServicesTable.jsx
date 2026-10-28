import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';

/**
 * RecentServicesTable — so'nggi xizmatlar jadvali
 */
export default function RecentServicesTable({ services = [], loading }) {
  const theme = useSelector((s) => s.themes.theme);
  const [search, setSearch] = useState('');

  const filtered = search
    ? services.filter((s) => {
        const q = search.toLowerCase();
        return (
          s.customerName?.toLowerCase().includes(q) ||
          s.plate?.toLowerCase().includes(q) ||
          s.vehicle?.toLowerCase().includes(q) ||
          s.oilBrand?.toLowerCase().includes(q)
        );
      })
    : services.slice(0, 7);

  return (
    <div className={`p-5 rounded-2xl border ${theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold font-[title]">So'nggi Moy Almashtirish Xizmatlari</h2>
          <p className="text-xs text-gray-400">Oxirgi amalga oshirilgan xizmatlar ro'yxati</p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs sm:w-60 ${
            theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <Search size={13} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mijoz yoki raqam..."
            className="w-full bg-transparent outline-none text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 size={22} className="animate-spin text-primary mr-2" />
          <span className="text-xs">Yuklanmoqda...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-xs">
          {search ? 'Natija topilmadi' : 'Hozircha xizmatlar mavjud emas'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={`text-xs uppercase font-[title] border-b ${theme ? 'border-white/10 bg-white/5 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
              <tr>
                <th className="px-4 py-3">Mijoz</th>
                <th className="px-4 py-3">Avtomobil & Raqam</th>
                <th className="px-4 py-3">Moy & Miqdori</th>
                <th className="px-4 py-3">Probeg</th>
                <th className="px-4 py-3">Keyingi Servis</th>
                <th className="px-4 py-3 text-right">Summa</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs sm:text-sm ${theme ? 'divide-white/5 text-gray-200' : 'divide-gray-100 text-gray-800'}`}>
              {filtered.map((s) => (
                <tr key={s._id || s.id} className={theme ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{s.customerName || 'Mijoz'}</div>
                    <div className="text-[11px] text-gray-400">
                      {new Date(s.serviceDate || s.createdAt).toLocaleDateString('uz-UZ')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-primary font-mono font-bold text-[11px]">
                        {s.plate || '—'}
                      </span>
                      <span className="text-xs text-gray-400">{s.vehicle || ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{s.oilBrand}</span>{' '}
                    <span className="text-amber-400 font-mono text-xs">{s.viscosity}</span>
                    <span className="text-gray-400 text-xs ml-1">({s.oilQuantity || 4}L)</span>
                  </td>
                  <td className="px-4 py-3 font-mono">{(s.odometerKm || 0).toLocaleString()} km</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-emerald-400 font-medium">
                      {s.nextDueDate ? new Date(s.nextDueDate).toLocaleDateString('uz-UZ') : '—'}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {s.nextDueKm ? `${s.nextDueKm.toLocaleString()} km` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400 font-mono">
                    {(Number(s.price) || 0).toLocaleString()} UZS
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
