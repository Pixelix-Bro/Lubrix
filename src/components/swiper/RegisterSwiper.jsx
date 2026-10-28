import { CheckCircle2, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';
import { useSelector } from 'react-redux';

export default function RegisterSwiper() {
  const theme = useSelector((state) => state.themes.theme);

  return (
    <div className="w-[50%] hidden lg:flex h-screen relative overflow-hidden bg-black select-none">
      {/* Background High Definition Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/start/backgroundWebp.webp"
        className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105"
      >
        <source src="/video/checkout.mp4" type="video/mp4" />
      </video>

      {/* Atmospheric overlays */}
      <div
        className={`absolute inset-0 bg-gradient-to-t ${
          theme ? 'from-surface via-surface/60 to-transparent' : 'from-black/80 via-black/40 to-black/20'
        }`}
      />
      <div
        className={`absolute inset-0 bg-gradient-to-l ${
          theme ? 'from-transparent via-transparent to-surface' : 'from-transparent via-transparent to-white'
        }`}
      />

      {/* Informative text side */}
      <div className="relative z-20 flex flex-col justify-end p-12 text-white max-w-lg space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 text-xs font-semibold backdrop-blur-md w-fit">
          <Sparkles size={14} />
          <span>SaaS Enterprise Obuna</span>
        </div>

        <h2 className="text-3xl xl:text-4xl font-bold font-[title] leading-tight text-white drop-shadow-md">
          Mijozlar Bazasi va Tushumlar To‘liq Nazorat Ostida
        </h2>

        <p className="text-sm text-gray-300 leading-relaxed drop-shadow">
          Hisobingizni ro‘yxatdan o‘tkazing, kerakli tarifni tanlang va servisingiz ish unumdorligini 40% ga oshiring.
        </p>

        <div className="space-y-2 pt-2 text-xs font-medium text-gray-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>Xavfsiz Uzcard, Humo, Click, Payme to‘lov integratsiyasi</span>
          </div>
          <div className="flex items-center gap-2.5">
            <TrendingUp size={16} className="text-blue-400 shrink-0" />
            <span>12 oylik chuqurlashtirilgan analitika va real tushum hisoboti</span>
          </div>
        </div>
      </div>
    </div>
  );
}
