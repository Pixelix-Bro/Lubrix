import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  History,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { lubrixApi } from '../services/api';
import { lubrixSocket } from '../services/socket';

export default function Reminders() {
  const theme = useSelector((state) => state.themes.theme);
  const [reminders, setReminders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('reminders'); // 'reminders' | 'logs'
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const [remRes, logsRes] = await Promise.all([
        lubrixApi.getReminders(),
        lubrixApi.getNotificationLogs(),
      ]);
      setReminders(remRes.data?.data || []);
      setLogs(logsRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsub = lubrixSocket.subscribe('reminder:sent', (data) => {
      setReminders((prev) =>
        prev.map((r) => ((r._id || r.id) === (data.reminder?._id || data.reminder?.id) ? data.reminder : r))
      );
      if (data.log) {
        setLogs((prev) => [data.log, ...prev]);
      }
    });
    return () => unsub();
  }, []);

  const handleSendSms = async (id) => {
    try {
      setSendingId(id);
      await lubrixApi.sendReminderSms(id);
      await loadData();
    } catch (err) {
      console.error('Failed to send SMS:', err);
    } finally {
      setSendingId(null);
    }
  };

  const filteredReminders = reminders.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (r.customerName && r.customerName.toLowerCase().includes(q)) ||
      (r.vehicleLabel && r.vehicleLabel.toLowerCase().includes(q));

    if (filterStatus === 'ALL') return matchesSearch;
    return matchesSearch && r.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide flex items-center gap-2.5">
            <Bell className="text-amber-500" size={24} />
            <span>Moy Almashtirish Eslatmalari (SMS & Bot)</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Mijozlarga moy muddati yetib kelganda avtomatlashgan eslatmalar yuborish
          </p>
        </div>

        {/* Tab Toggle */}
        <div
          className={`flex p-1 rounded-xl border ${
            theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
          }`}
        >
          <button
            onClick={() => setTab('reminders')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
              tab === 'reminders'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Rejalashtirilgan Eslatmalar
          </button>
          <button
            onClick={() => setTab('logs')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
              tab === 'logs'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Yuborilgan Xabarlar Tarixi ({logs.length})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`sm:col-span-2 flex items-center gap-3 px-4 py-3 rounded-xl border ${
            theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
          }`}
        >
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mijoz ismi yoki avtomobil bo‘yicha qidirish..."
            className="w-full bg-transparent outline-none text-sm placeholder:text-gray-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`px-4 py-3 rounded-xl border text-sm outline-none transition ${
            theme
              ? 'border-white/10 bg-surface text-white'
              : 'border-gray-200 bg-white text-gray-800'
          }`}
        >
          <option value="ALL">Barcha Holatlar</option>
          <option value="scheduled">Rejalashtirilgan (Kutilmoqda)</option>
          <option value="sent">Yuborilgan (Muvaffaqiyatli)</option>
          <option value="failed">Yuborilmadi (Xatolik)</option>
        </select>
      </div>

      {/* Tab 1: Scheduled Reminders */}
      {tab === 'reminders' && (
        <div
          className={`rounded-2xl border overflow-hidden ${
            theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 size={32} className="animate-spin text-primary mb-3" />
              <p className="text-sm">Eslatmalar yuklanmoqda...</p>
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ShieldCheck size={44} className="text-emerald-500 mb-3" />
              <p className="text-base font-semibold">Barcha eslatmalar ko‘rib chiqilgan</p>
              <p className="text-xs text-gray-500 mt-1">
                Yangi xizmat qo‘shilganda eslatmalar avtomatik shakllanadi
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead
                  className={`text-xs uppercase font-[title] tracking-wider border-b ${
                    theme
                      ? 'border-white/10 bg-white/5 text-gray-400'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                >
                  <tr>
                    <th className="px-5 py-4">Mijoz & Avtomobil</th>
                    <th className="px-5 py-4">Kanal</th>
                    <th className="px-5 py-4">Yuborish Sanasi</th>
                    <th className="px-5 py-4">Holat</th>
                    <th className="px-5 py-4">Urinishlar</th>
                    <th className="px-5 py-4 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${
                    theme ? 'divide-white/5 text-gray-200' : 'divide-gray-100 text-gray-800'
                  }`}
                >
                  {filteredReminders.map((r) => {
                    const isSent = r.status === 'sent';
                    const isSending = sendingId === (r._id || r.id);

                    return (
                      <tr
                        key={r._id || r.id}
                        className={`transition ${
                          theme ? 'hover:bg-white/5' : 'hover:bg-gray-50/80'
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-sm">{r.customerName || 'Mijoz'}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{r.vehicleLabel || 'Avtomobil'}</div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Smartphone size={13} />
                            <span>{r.channel || 'SMS'}</span>
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono text-xs">
                          {new Date(r.dueAt).toLocaleDateString('uz-UZ')}
                        </td>

                        <td className="px-5 py-4">
                          {isSent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 size={12} />
                              <span>Yuborildi</span>
                            </span>
                          ) : r.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              <XCircle size={12} />
                              <span>Xatolik</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock size={12} />
                              <span>Kutilmoqda</span>
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs text-gray-400 font-mono">
                          {r.attempts || 0} marta
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleSendSms(r._id || r.id)}
                            disabled={isSent || isSending}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              isSent
                                ? 'bg-emerald-500/10 text-emerald-400 cursor-default'
                                : 'bg-primary hover:bg-blue-600 text-white shadow-sm'
                            }`}
                          >
                            {isSending ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Yuborilmoqda...</span>
                              </>
                            ) : isSent ? (
                              <>
                                <Check size={13} />
                                <span>Yetkazildi</span>
                              </>
                            ) : (
                              <>
                                <Send size={13} />
                                <span>Hozir Yuborish</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Message Logs */}
      {tab === 'logs' && (
        <div
          className={`rounded-2xl border overflow-hidden ${
            theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
          }`}
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MessageSquare size={44} className="text-gray-500 mb-3" />
              <p className="text-base font-semibold">Xabarlar tarixi bo‘sh</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead
                  className={`text-xs uppercase font-[title] tracking-wider border-b ${
                    theme
                      ? 'border-white/10 bg-white/5 text-gray-400'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                >
                  <tr>
                    <th className="px-5 py-4">Yuborilgan Vaqt</th>
                    <th className="px-5 py-4">Mijoz</th>
                    <th className="px-5 py-4">Telefon Raqami</th>
                    <th className="px-5 py-4">Provayder</th>
                    <th className="px-5 py-4">Holat</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${
                    theme ? 'divide-white/5 text-gray-200' : 'divide-gray-100 text-gray-800'
                  }`}
                >
                  {logs.map((log) => (
                    <tr
                      key={log._id || log.id}
                      className={theme ? 'hover:bg-white/5' : 'hover:bg-gray-50/80'}
                    >
                      <td className="px-5 py-4 text-xs text-gray-400 font-mono">
                        {new Date(log.sentAt || log.createdAt).toLocaleString('uz-UZ')}
                      </td>
                      <td className="px-5 py-4 font-semibold text-xs sm:text-sm">
                        {log.customerName || 'Mijoz'}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-emerald-400">
                        {log.phone || '—'}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <span className="uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-primary">
                          {log.provider || 'Eskiz / Mock'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={12} />
                          <span>Yetkazildi</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
