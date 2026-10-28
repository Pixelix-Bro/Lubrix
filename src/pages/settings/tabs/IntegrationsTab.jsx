import { AlertCircle, Bot, CheckCircle2, Eye, EyeOff, Loader2, Send } from 'lucide-react';
import { useSelector } from 'react-redux';

/**
 * IntegrationsTab — Telegram Bot & Integratsiyalar
 */
export default function IntegrationsTab({
  telegramData,
  setTelegramData,
  tokenVerifying,
  showToken,
  setShowToken,
  onVerifyTelegram,
  onSaveTelegram,
  onSendTestMessage,
  saving,
}) {
  const theme = useSelector((s) => s.themes.theme);

  const inputCls = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition ${
    theme
      ? 'border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-primary/50'
      : 'border-gray-200 bg-white text-gray-900 focus:border-primary/50'
  }`;

  const labelCls = `block text-xs font-semibold mb-1 ${theme ? 'text-gray-300' : 'text-gray-600'}`;

  return (
    <div className="space-y-6">
      <div className={`p-5 rounded-2xl border ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
              <Bot size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold font-[title]">Telegram Bot Integratsiyasi</h3>
              <p className="text-xs text-gray-400">Navbatlar, yangi mijozlar va xizmat hisobotlarini bot orqali qabul qilish</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
              telegramData.isActive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {telegramData.isActive ? 'FAOL' : 'NOFAOL'}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Bot Token (@BotFather dan olingan)</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={telegramData.botToken || ''}
                onChange={(e) => setTelegramData((p) => ({ ...p, botToken: e.target.value }))}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className={`${inputCls} pr-24`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  type="button"
                  onClick={onVerifyTelegram}
                  disabled={tokenVerifying || !telegramData.botToken}
                  className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {tokenVerifying ? <Loader2 size={13} className="animate-spin" /> : 'Tekshirish'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Bot Foydalanuvchi Nomi (Username)</label>
              <input
                type="text"
                readOnly
                value={telegramData.botUsername ? `@${telegramData.botUsername}` : '—'}
                className={`${inputCls} opacity-80 cursor-not-allowed`}
              />
            </div>
            <div>
              <label className={labelCls}>Admin Chat ID (Xabarlar keladigan Telegram ID)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={telegramData.ownerTelegramChatId || ''}
                  onChange={(e) => setTelegramData((p) => ({ ...p, ownerTelegramChatId: e.target.value }))}
                  placeholder="987654321"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={onSendTestMessage}
                  disabled={!telegramData.ownerTelegramChatId}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send size={14} /> Test
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Qarshilash Xabari (Welcome Message)</label>
            <textarea
              rows={2}
              value={telegramData.welcomeMessage || ''}
              onChange={(e) => setTelegramData((p) => ({ ...p, welcomeMessage: e.target.value }))}
              className={inputCls}
            />
          </div>

          {/* Bildirishnomalar turi */}
          <div>
            <label className={labelCls}>Yuboriladigan Xabarnomalar</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2">
              {[
                { key: 'newBooking', label: 'Yangi buyurtma (Booking)' },
                { key: 'serviceCompleted', label: 'Xizmat tugallanganda' },
                { key: 'lowStock', label: 'Moy zaxirasi kam qolganda' },
                { key: 'dailyReport', label: 'Kunlik tushum hisoboti' },
                { key: 'newCustomer', label: 'Yangi mijoz qo‘shilganda' },
                { key: 'bookingCancelled', label: 'Bekor qilingan buyurtma' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition ${
                    telegramData.notifications?.[key]
                      ? 'border-sky-500/40 bg-sky-500/10 text-sky-400 font-medium'
                      : theme ? 'border-white/5 bg-white/5 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!telegramData.notifications?.[key]}
                    onChange={(e) =>
                      setTelegramData((p) => ({
                        ...p,
                        notifications: { ...p.notifications, [key]: e.target.checked },
                      }))
                    }
                    className="rounded text-sky-500 focus:ring-0"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onSaveTelegram}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Telegram Sozlamalarini Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}
