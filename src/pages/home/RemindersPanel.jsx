import { BellRing, Check, Loader2, Send, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * RemindersPanel — yaqin eslatmalar paneli
 */
export default function RemindersPanel({ reminders = [], onSendSms, sendingId }) {
  const theme = useSelector((s) => s.themes.theme);

  return (
    <div
      className={`flex flex-col p-5 rounded-2xl border ${
        theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold font-[title] flex items-center gap-2">
            <BellRing size={16} className="text-amber-500" />
            <span>Yaqin Eslatmalar</span>
          </h2>
          <p className="text-xs text-gray-400">Moy muddati kelgan mijozlar</p>
        </div>
        <Link to="/reminders" className="text-xs text-primary hover:underline">
          Barchasi
        </Link>
      </div>

      {/* List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-64 pr-1">
        {reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <ShieldCheck size={30} className="text-emerald-500 mb-2" />
            <p className="text-xs font-medium">Barcha mijozlar xabardor qilingan</p>
          </div>
        ) : (
          reminders.slice(0, 5).map((r) => {
            const id    = r._id || r.id;
            const isSent    = r.status === 'sent';
            const isSending = sendingId === id;

            return (
              <div
                key={id}
                className={`p-3 rounded-xl border transition ${
                  theme ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{r.customerName || 'Mijoz'}</p>
                    <p className="text-[11px] text-gray-400 truncate">{r.vehicleLabel || 'Avtomobil'}</p>
                    <p className="text-[10px] text-amber-500 mt-1 font-mono">
                      Muddat: {new Date(r.dueAt).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>

                  <button
                    onClick={() => onSendSms(id)}
                    disabled={isSent || isSending}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1 transition ${
                      isSent
                        ? 'bg-emerald-500/10 text-emerald-400 cursor-default'
                        : 'bg-primary hover:bg-blue-600 text-white shadow-sm'
                    }`}
                  >
                    {isSending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isSent ? (
                      <><Check size={12} /><span>Yuborildi</span></>
                    ) : (
                      <><Send size={12} /><span>SMS</span></>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
