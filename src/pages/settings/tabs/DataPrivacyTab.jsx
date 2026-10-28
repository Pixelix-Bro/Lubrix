import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useSelector } from 'react-redux';

/**
 * DataPrivacyTab — Audit Log & Xavfsizlik Jurnali
 */
export default function DataPrivacyTab({ auditLogs }) {
  const theme = useSelector((s) => s.themes.theme);

  return (
    <div className="space-y-6">
      <div className={`p-5 rounded-2xl border ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'}`}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold font-[title]">Xavfsizlik & Audit Jurnali</h3>
            <p className="text-xs text-gray-400">Tizimda har bir foydalanuvchi tomonidan amalga oshirilgan harakatlar tarixi</p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-left text-xs">
            <thead className={`border-b sticky top-0 ${theme ? 'bg-surface border-white/10 text-gray-400' : 'bg-white border-gray-200 text-gray-600'}`}>
              <tr>
                <th className="py-2.5 px-3">Sana</th>
                <th className="py-2.5 px-3">Foydalanuvchi</th>
                <th className="py-2.5 px-3">Amal</th>
                <th className="py-2.5 px-3">Modul</th>
                <th className="py-2.5 px-3">Tafsilot</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme ? 'divide-white/5 text-gray-300' : 'divide-gray-100 text-gray-700'}`}>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                    Hozircha audit yozuvlari mavjud emas
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log._id || log.id} className={theme ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                    <td className="py-2.5 px-3 font-mono text-gray-400">
                      {new Date(log.createdAt).toLocaleString('uz-UZ')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{log.userName || 'Tizim'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-primary font-mono font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-400">{log.entity}</td>
                    <td className="py-2.5 px-3 text-gray-300 max-w-xs truncate">{log.details || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
