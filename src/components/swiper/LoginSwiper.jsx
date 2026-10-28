import { Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { useSelector } from 'react-redux';

export default function LoginSwiper() {
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
        className="absolute inset-0 w-full h-full object-cover opacity-65 scale-105"
      >
        <source src="/video/background.mp4" type="video/mp4" />
      </video>

      {/* Cinematic dark/light overlay gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-t ${
          theme ? 'from-surface via-surface/60 to-transparent' : 'from-black/80 via-black/40 to-black/20'
        }`}
      />
      <div
        className={`absolute inset-0 bg-gradient-to-r ${
          theme ? 'from-transparent via-transparent to-surface' : 'from-transparent via-transparent to-white'
        }`}
      />

      {/* Captivating Brand Text Overlay */}
      <div className="relative z-20 flex flex-col justify-end p-12 text-white max-w-lg space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-400 text-xs font-semibold backdrop-blur-md w-fit">
          <Sparkles size={14} />
          <span>Professional CRM Platform</span>
        </div>

        <h2 className="text-3xl xl:text-4xl font-bold font-[title] leading-tight text-white drop-shadow-md">
          Avtoservisingizni Yangi Bosqichga Olib Chiqing
        </h2>

        <p className="text-sm text-gray-300 leading-relaxed drop-shadow">
          Moy almashtirish shoxobchalari, do‘konlar va xizmat ko‘rsatish markazlari uchun yagona avtomatlashtirilgan aqlli tizim.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-medium text-gray-200">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-400 shrink-0" />
            <span>Tezkor ANPR Kamera & POS</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>Avtomatik SMS & Telegram Bot</span>
          </div>
        </div>
      </div>
    </div>
  );
}
