import { useSelector } from 'react-redux';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#2563EB','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#84cc16'];

/**
 * OilBrandPieChart — moy markalari taqsimoti
 */
export default function OilBrandPieChart({ data = [] }) {
  const theme = useSelector((s) => s.themes.theme);

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        Ma'lumotlar mavjud emas
      </div>
    );
  }

  return (
    <>
      <div className="h-52 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={4}
              dataKey="count"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: theme ? '#0f172a' : '#ffffff',
                borderColor:     theme ? '#1e293b' : '#e2e8f0',
                borderRadius:    '8px',
                fontSize:        '12px',
              }}
              formatter={(v, n, p) => [`${v} ta xizmat`, p.payload.name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 space-y-1.5">
        {data.slice(0, 6).map((b, i) => (
          <div key={b.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="truncate max-w-[100px]">{b.name}</span>
            </div>
            <span className="font-semibold shrink-0">{b.count} ta</span>
          </div>
        ))}
      </div>
    </>
  );
}
