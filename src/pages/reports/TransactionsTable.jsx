import { useSelector } from 'react-redux';

/**
 * TransactionsTable — so'nggi tranzaksiyalar jadvali
 */
export default function TransactionsTable({ services = [] }) {
  const theme = useSelector((s) => s.themes.theme);

  if (!services || services.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-xs">
        Tranzaksiyalar mavjud emas
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className={`text-xs uppercase font-[title] border-b ${theme ? 'border-white/10 bg-white/5 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
          <tr>
            <th className="px-4 py-3">Sana</th>
            <th className="px-4 py-3">Mijoz</th>
            <th className="px-4 py-3">Avtomobil / Raqam</th>
            <th className="px-4 py-3">Moy & Viskozitet</th>
            <th className="px-4 py-3 text-right">Summa (UZS)</th>
          </tr>
        </thead>
        <tbody className={`divide-y text-xs sm:text-sm ${theme ? 'divide-white/5 text-gray-200' : 'divide-gray-100 text-gray-800'}`}>
          {services.slice(0, 20).map((s) => (
            <tr key={s._id || s.id} className={theme ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
              <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">
                {new Date(s.serviceDate || s.createdAt).toLocaleDateString('uz-UZ')}
              </td>
              <td className="px-4 py-3 font-medium">{s.customerName || 'Mijoz'}</td>
              <td className="px-4 py-3">
                <span className="font-mono text-primary font-bold">{s.plate || '—'}</span>{' '}
                <span className="text-gray-400 text-xs">({s.vehicle || ''})</span>
              </td>
              <td className="px-4 py-3">
                {s.oilBrand} ·{' '}
                <span className="font-mono text-amber-400">{s.viscosity}</span>
              </td>
              <td className="px-4 py-3 text-right font-bold text-emerald-400 font-mono">
                {(Number(s.price) || 0).toLocaleString()} UZS
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
