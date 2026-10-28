import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useSelector } from 'react-redux';

/**
 * StatsCard — KPI karta
 * @param {React.ReactNode} icon
 * @param {string} label
 * @param {string|number} value
 * @param {string} [delta]      — "+14.2%"
 * @param {boolean} [positive]
 * @param {string} [sub]        — qo'shimcha matn
 * @param {string} [color]      — 'blue'|'emerald'|'amber'|'purple'|'rose'
 */
export default function StatsCard({ icon, label, value, delta, positive = true, sub, color = 'blue' }) {
  const theme = useSelector((s) => s.themes.theme);

  const colorMap = {
    blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400'   },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400'},
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400'  },
    purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-400' },
    rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400'   },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`p-4 rounded-2xl border flex flex-col gap-3 ${
        theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
      }`}
    >
      {/* Icon + Label */}
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-xl ${c.bg}`}>
          <span className={c.text}>{icon}</span>
        </div>
        {delta && (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold ${
              positive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {delta}
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-bold font-[title] tracking-tight">{value}</p>
        <p className={`text-xs mt-0.5 ${theme ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
        {sub && <p className={`text-[11px] mt-1 ${c.text}`}>{sub}</p>}
      </div>
    </div>
  );
}
