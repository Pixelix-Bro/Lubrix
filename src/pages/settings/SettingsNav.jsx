import {
  Bell,
  Bot,
  Building2,
  Camera,
  CreditCard,
  HelpCircle,
  Palette,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  User,
  Warehouse,
} from 'lucide-react';
import { useSelector } from 'react-redux';

export const SETTINGS_SECTIONS = [
  { id: 'general', title: 'Umumiy Sozlamalar', icon: Building2 },
  { id: 'appearance', title: 'Tashqi Ko‘rinish & Til', icon: Palette },
  { id: 'account', title: 'Profil & Parol', icon: User },
  { id: 'billing', title: 'To‘lov Kartalari & Kassa', icon: CreditCard },
  { id: 'integrations', title: 'Telegram Bot & Xizmatlar', icon: Bot },
  { id: 'camera', title: 'Yo‘lak Kamerasi (ANPR)', icon: Camera },
  { id: 'inventory', title: 'Ombor & Mahsulotlar', icon: Warehouse },
  { id: 'dataPrivacy', title: 'Xavfsizlik & Audit Jurnali', icon: ShieldAlert },
  { id: 'help', title: 'Dastur Haqida & Yordam', icon: HelpCircle },
];

/**
 * SettingsNav — Sozlamalar bo'limlarining chap tomondagi navigatsiyasi
 */
export default function SettingsNav({ activeTab, setActiveTab, search, setSearch }) {
  const theme = useSelector((s) => s.themes.theme);

  const filteredSections = SETTINGS_SECTIONS.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className={`p-3 rounded-2xl border flex flex-col gap-2 ${
        theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
      }`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
          theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Bo‘lim qidirish..."
          className="w-full bg-transparent outline-none text-xs"
        />
      </div>

      <nav className="space-y-1">
        {filteredSections.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition text-left ${
                isActive
                  ? 'bg-primary text-white font-semibold shadow-sm'
                  : theme
                  ? 'text-gray-300 hover:bg-white/5'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white' : 'text-gray-400'} />
              <span className="truncate">{item.title}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
