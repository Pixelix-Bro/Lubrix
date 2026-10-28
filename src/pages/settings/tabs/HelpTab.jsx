import { HelpCircle, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useSelector } from 'react-redux';

/**
 * HelpTab — Dastur haqida va texnik yordam
 */
export default function HelpTab() {
  const theme = useSelector((s) => s.themes.theme);

  return (
    <div className="space-y-6">
      <div className={`p-5 rounded-2xl border ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'}`}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-primary">
            <HelpCircle size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold font-[title]">Lubrix Smart CRM Haqida</h3>
            <p className="text-xs text-gray-400">Avtoservis va moy almashtirish shoxobchalarini avtomatlashtirish tizimi</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-300">
          <div className="flex justify-between py-2 border-b border-inherit">
            <span className="text-gray-400">Dastur versiyasi:</span>
            <span className="font-mono font-bold text-white">v2.1.0 Enterprise</span>
          </div>
          <div className="flex justify-between py-2 border-b border-inherit">
            <span className="text-gray-400">Ma'lumotlar bazasi:</span>
            <span className="font-mono text-emerald-400">MongoDB Multi-tenant Secure Cluster</span>
          </div>
          <div className="flex justify-between py-2 border-b border-inherit">
            <span className="text-gray-400">ANPR Sun'iy Intellekt:</span>
            <span className="font-mono text-blue-400">Faol (OCR Plate Recognition)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-inherit">
            <span className="text-gray-400">Real-time Aloqa:</span>
            <span className="font-mono text-amber-400">Socket.IO Bidirectional Gateway</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-inherit flex flex-col sm:flex-row gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-primary" />
            <span>Qo‘llab-quvvatlash: +998 71 200 11 22</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-primary" />
            <span>Email: support@lubrix.uz</span>
          </div>
        </div>
      </div>
    </div>
  );
}
