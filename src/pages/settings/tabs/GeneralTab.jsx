import { Save, CheckCircle2, AlertCircle, Loader2, Building2, MapPin, Clock, Wrench, MessageSquare } from 'lucide-react';
import { useSelector } from 'react-redux';

/**
 * GeneralTab — Umumiy Sozlamalar tab
 */
export default function GeneralTab({ orgData, setOrgData, onSave, saving, savedSuccess, errorMsg }) {
  const theme = useSelector((s) => s.themes.theme);

  const inputCls = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition ${
    theme
      ? 'border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-primary/50'
      : 'border-gray-200 bg-white text-gray-900 focus:border-primary/50'
  }`;

  const labelCls = `block text-xs font-semibold mb-1 ${theme ? 'text-gray-300' : 'text-gray-600'}`;

  return (
    <form onSubmit={onSave} className="space-y-6">
      {/* Kompaniya ma'lumotlari */}
      <div>
        <h3 className="text-sm font-bold font-[title] flex items-center gap-2 mb-4">
          <Building2 size={15} className="text-primary" />
          Kompaniya Ma'lumotlari
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Kompaniya Nomi *</label>
            <input
              type="text"
              required
              value={orgData.name || ''}
              onChange={(e) => setOrgData((p) => ({ ...p, name: e.target.value }))}
              className={inputCls}
              placeholder="Lubrix Avto Servis"
            />
          </div>
          <div>
            <label className={labelCls}>Telefon Raqam</label>
            <input
              type="tel"
              value={orgData.phone || ''}
              onChange={(e) => setOrgData((p) => ({ ...p, phone: e.target.value }))}
              className={inputCls}
              placeholder="+998712001122"
            />
          </div>
          <div>
            <label className={labelCls}>Elektron Pochta</label>
            <input
              type="email"
              value={orgData.email || ''}
              onChange={(e) => setOrgData((p) => ({ ...p, email: e.target.value }))}
              className={inputCls}
              placeholder="info@servis.uz"
            />
          </div>
          <div>
            <label className={labelCls}>Valyuta</label>
            <select
              value={orgData.currency || 'UZS'}
              onChange={(e) => setOrgData((p) => ({ ...p, currency: e.target.value }))}
              className={inputCls}
            >
              <option value="UZS">UZS (So'm)</option>
              <option value="USD">USD (Dollar)</option>
              <option value="RUB">RUB (Rubl)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Manzil</label>
            <input
              type="text"
              value={orgData.address || ''}
              onChange={(e) => setOrgData((p) => ({ ...p, address: e.target.value }))}
              className={inputCls}
              placeholder="Toshkent sh., Yunusobod tumani"
            />
          </div>
        </div>
      </div>

      {/* Vaqt va til */}
      <div>
        <h3 className="text-sm font-bold font-[title] flex items-center gap-2 mb-4">
          <Clock size={15} className="text-primary" />
          Vaqt Mintaqasi & Til
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Vaqt Mintaqasi</label>
            <select
              value={orgData.timezone || 'Asia/Tashkent'}
              onChange={(e) => setOrgData((p) => ({ ...p, timezone: e.target.value }))}
              className={inputCls}
            >
              <option value="Asia/Tashkent">Asia/Tashkent (UTC+5)</option>
              <option value="Europe/Moscow">Europe/Moscow (UTC+3)</option>
              <option value="Asia/Almaty">Asia/Almaty (UTC+5)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Standart Til</label>
            <select
              value={orgData.defaultLocale || 'uz'}
              onChange={(e) => setOrgData((p) => ({ ...p, defaultLocale: e.target.value }))}
              className={inputCls}
            >
              <option value="uz">O'zbekcha</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Ish Kunlari</label>
            <input
              type="text"
              value={orgData.settings?.workingDays || 'Dushanba - Shanba'}
              onChange={(e) => setOrgData((p) => ({
                ...p,
                settings: { ...p.settings, workingDays: e.target.value }
              }))}
              className={inputCls}
              placeholder="Dushanba - Shanba"
            />
          </div>
        </div>
      </div>

      {/* SMS Sozlamalari */}
      <div>
        <h3 className="text-sm font-bold font-[title] flex items-center gap-2 mb-4">
          <MessageSquare size={15} className="text-primary" />
          SMS Sozlamalari
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>SMS Provayder</label>
            <select
              value={orgData.settings?.smsProvider || 'eskiz'}
              onChange={(e) => setOrgData((p) => ({
                ...p,
                settings: { ...p.settings, smsProvider: e.target.value }
              }))}
              className={inputCls}
            >
              <option value="eskiz">Eskiz.uz</option>
              <option value="playmobile">PlayMobile</option>
              <option value="twilio">Twilio</option>
              <option value="mock">Mock (Test)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>SMS Jo'natuvchi Nomi</label>
            <input
              type="text"
              value={orgData.settings?.smsSender || '4546'}
              onChange={(e) => setOrgData((p) => ({
                ...p,
                settings: { ...p.settings, smsSender: e.target.value }
              }))}
              className={inputCls}
              placeholder="4546"
            />
          </div>
        </div>

        {/* Auto Reminders Toggle */}
        <div
          className={`flex items-center justify-between p-3 rounded-xl border mt-3 ${
            theme ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'
          }`}
        >
          <div>
            <p className="text-xs font-semibold">Avtomatik Eslatmalar</p>
            <p className={`text-[11px] mt-0.5 ${theme ? 'text-gray-400' : 'text-gray-500'}`}>
              Moy muddati kelgan mijozlarga SMS avtomatik yuborilsin
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOrgData((p) => ({
              ...p,
              settings: { ...p.settings, autoReminders: !p.settings?.autoReminders }
            }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              orgData.settings?.autoReminders ? 'bg-primary' : theme ? 'bg-white/20' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                orgData.settings?.autoReminders ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Xato va muvaffaqiyat xabarlari */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}
      {savedSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <CheckCircle2 size={14} />
          Sozlamalar muvaffaqiyatli saqlandi!
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white text-sm font-semibold transition disabled:opacity-60"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </form>
  );
}
