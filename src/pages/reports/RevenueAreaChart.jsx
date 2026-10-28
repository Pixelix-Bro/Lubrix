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
 * RevenueAreaChart — 12 oylik daromad grafigi
 */
export default function RevenueAreaChart({ data = [] }) {
  const theme = useSelector((s) => s.themes.theme);

  if (!data || data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
        Ma'lumotlar mavjud emas
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRev12" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0}   />
            </linearGradient>
            <linearGradient id="colorSrv12" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.6} />
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
            width={42}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: theme ? '#0f172a' : '#ffffff',
              borderColor:     theme ? '#1e293b' : '#e2e8f0',
              borderRadius:    '12px',
              fontSize:        '12px',
              color:           theme ? '#fff' : '#000',
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
            fill="url(#colorRev12)"
            name="revenue"
          />
          <Area
            type="monotone"
            dataKey="services"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorSrv12)"
            name="services"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
