import { useSelector } from 'react-redux';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * RevenueChart — AreaChart: haftalik / oylik daromad grafigi
 * @param {Array} data  — [{ name, revenue, services }]
 * @param {string} [title]
 */
export default function RevenueChart({ data = [], title = "Daromad Dinamikasi" }) {
  const theme = useSelector((s) => s.themes.theme);

  const isEmpty = !data || data.length === 0 || data.every(d => d.revenue === 0);

  return (
    <div
      className={`p-5 rounded-2xl border ${
        theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
      }`}
    >
      <h2 className="text-base font-bold font-[title] mb-0.5">{title}</h2>
      <p className="text-xs text-gray-400 mb-4">UZS hisobida</p>

      {isEmpty ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          Ma'lumotlar mavjud emas
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevHome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="colorSrvHome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={theme ? '#1e293b' : '#f1f5f9'} />

              <XAxis
                dataKey="name"
                stroke={theme ? '#64748b' : '#94a3b8'}
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                stroke={theme ? '#64748b' : '#94a3b8'}
                tick={{ fontSize: 10 }}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme ? '#0f172a' : '#ffffff',
                  borderColor:     theme ? '#1e293b' : '#e2e8f0',
                  borderRadius:    '12px',
                  fontSize:        '12px',
                }}
                formatter={(value, name) => [
                  name === 'revenue'
                    ? `${Number(value).toLocaleString()} UZS`
                    : `${value} ta`,
                  name === 'revenue' ? 'Daromad' : 'Xizmatlar',
                ]}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563EB"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevHome)"
              />
              <Area
                type="monotone"
                dataKey="services"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSrvHome)"
                yAxisId={0}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
