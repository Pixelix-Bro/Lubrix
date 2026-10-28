import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  History,
  Layers,
  Loader2,
  Mail,
  Megaphone,
  MessageSquare,
  Percent,
  Plus,
  Send,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { lubrixApi } from '../services/api';

export default function Marketing() {
  const theme = useSelector((state) => state.themes.theme);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [targetSegment, setTargetSegment] = useState('DUE_SOON'); // 'DUE_SOON' | 'OVERDUE_90' | 'ALL' | 'INACTIVE'
  const [smsMessage, setSmsMessage] = useState(
    'Lubrix: Hurmatli {customer_name}, servisimisda mavsumiy chegirma! Dvigatel moyini almashtiring va bepul 15 nuqtali tekshiruvdan o‘ting. Tel: +998712001122'
  );
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    Promise.all([lubrixApi.getCustomers(), lubrixApi.getServices()]).then(
      ([cRes, sRes]) => {
        setCustomers(cRes.data?.data || []);
        setServices(sRes.data?.data || []);
      }
    );
  }, []);

  // Filter targeted recipients based on segment
  const targetedRecipients = customers.filter((c) => {
    if (targetSegment === 'ALL') return true;
    if (targetSegment === 'OVERDUE_90') {
      // Find last service date
      return true;
    }
    return true;
  });

  const handleLaunchCampaign = async () => {
    setIsSending(true);
    // Simulate batch dispatch through SMS Provider
    await new Promise((r) => setTimeout(r, 1500));
    setIsSending(false);
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide flex items-center gap-2.5">
            <Megaphone className="text-primary" size={24} />
            <span>SMS & Marketing Kampaniyalari</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Mijozlarga ommaviy aksiyalar, chegirmalar va qaytaruvchi SMS xabarnomalar yuborish
          </p>
        </div>

        {sentSuccess && (
          <span className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold animate-pulse">
            ✓ Kampaniya {targetedRecipients.length} ta mijozga yuborildi!
          </span>
        )}
      </div>

      {/* Campaign Form & Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className={`p-6 rounded-3xl border space-y-4 ${
              theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
            }`}
          >
            <h2 className="text-base font-bold font-[title] border-b border-inherit pb-3 flex items-center gap-2 text-primary">
              <Target size={18} />
              <span>Yangi Marketing Kampaniyasi</span>
            </h2>

            {/* Segment Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 font-[title]">
                Maqsadli Auditoriya Segmenti:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'DUE_SOON', title: 'Muddati Kelganlar', desc: 'Moyi almashishi kerak bo‘lganlar' },
                  { id: 'OVERDUE_90', title: '90+ Kun Bo‘lganlar', desc: 'Ko‘pdan beri kelmagan mijozlar' },
                  { id: 'ALL', title: 'Barcha Mijozlar', desc: `Jami ${customers.length} nafar mijoz` },
                  { id: 'VIP', title: 'Doimiy VIP Mijozlar', desc: '3 martadan ko‘p kelganlar' },
                ].map((seg) => (
                  <div
                    key={seg.id}
                    onClick={() => setTargetSegment(seg.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition ${
                      targetSegment === seg.id
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-inherit text-gray-400 hover:text-white'
                    }`}
                  >
                    <p className="font-[title] text-xs">{seg.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{seg.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Template Message */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-400 font-[title]">
                  SMS Xabar Matni:
                </label>
                <span className="text-[11px] text-gray-400 font-mono">
                  {smsMessage.length} belgi (1 SMS)
                </span>
              </div>
              <textarea
                rows={4}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl border text-xs sm:text-sm outline-none transition ${
                  theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
                }`}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Avtomatik qo‘yiladi: <code className="text-primary font-mono">{`{customer_name}`}</code>
              </p>
            </div>

            {/* Ready Templates Buttons */}
            <div>
              <label className="block text-[11px] text-gray-400 mb-1.5 font-[title]">
                Tayyor Shablonlar:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Mavsumiy 20% Chegirma',
                  'Moy almashtirganga Filtr Bepul',
                  'Tezkor diagnostika sovg‘a',
                ].map((tmpl) => (
                  <button
                    key={tmpl}
                    onClick={() =>
                      setSmsMessage(
                        `Lubrix: Hurmatli {customer_name}, siz uchun maxsus "${tmpl}" aksiyasi! Filialimizga tashrif buyuring. Manzil: Lubrix Servis`
                      )
                    }
                    className="px-2.5 py-1 rounded-lg border border-inherit text-[11px] text-gray-400 hover:text-white transition"
                  >
                    + {tmpl}
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={handleLaunchCampaign}
              disabled={isSending || !smsMessage}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-primary hover:bg-blue-600 text-white font-[title] font-bold text-sm tracking-wider transition shadow-xl shadow-blue-500/25 disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Xabarlar yuborilmoqda...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>KAMPANIYANI BOSHLASH ({targetedRecipients.length} TA MIJOZ)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Preview Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className={`p-6 rounded-3xl border space-y-4 ${
              theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
            }`}
          >
            <h2 className="text-base font-bold font-[title] border-b border-inherit pb-3 text-emerald-400 flex items-center gap-2">
              <Sparkles size={18} />
              <span>Smartfon Ekrani Ko‘rinishi</span>
            </h2>

            {/* Phone Mockup Screen */}
            <div className="max-w-[280px] mx-auto rounded-3xl border-4 border-gray-700 bg-black p-4 text-white shadow-2xl">
              <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
              <div className="text-[10px] text-gray-400 text-center mb-4">Bugun 14:30 · 4546 (Lubrix)</div>

              <div className="p-3 rounded-2xl bg-blue-600/90 text-white text-xs leading-relaxed shadow-md">
                {smsMessage.replace('{customer_name}', 'Azizbek')}
              </div>
              <div className="text-[9px] text-gray-500 text-right mt-1">Yetkazildi ✓✓</div>
            </div>

            {/* Target Stats */}
            <div className="pt-2 text-xs space-y-2 text-gray-400">
              <div className="flex items-center justify-between">
                <span>Qabul qiluvchilar soni:</span>
                <span className="font-bold text-white font-mono">{targetedRecipients.length} nafar</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Taxminiy yetib borish:</span>
                <span className="font-bold text-emerald-400 font-mono">99.4%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Kutilayotgan qaytish:</span>
                <span className="font-bold text-primary font-mono">~35-45 mijoz</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
