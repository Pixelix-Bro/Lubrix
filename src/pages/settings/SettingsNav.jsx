import {
  Bot,
  Building2,
  Camera,
  CreditCard,
  LockKeyhole,
  Palette,
  ShieldCheck,
  User,
  Warehouse,
} from 'lucide-react'
import { useSelector } from 'react-redux'

const SETTINGS_SECTIONS = [
  { id: 'general', title: 'Umumiy Sozlamalar', icon: Building2 },
  { id: 'appearance', title: 'Tashqi Ko‘rinish & Til', icon: Palette },
  { id: 'account', title: 'Profil & Parol', icon: User },
  { id: 'billing', title: 'To‘lov Kartalari & Kassa', icon: CreditCard },
  { id: 'integrations', title: 'Telegram Bot & Xizmatlar', icon: Bot },
  { id: 'camera', title: 'Yo‘lak Kamerasi (ANPR)', icon: Camera },
  { id: 'inventory', title: 'Ombor & Mahsulotlar', icon: Warehouse },
  { id: 'dataPrivacy', title: 'Ma’lumotlar & Audit', icon: ShieldCheck },
  { id: 'privacy', title: 'Maxfiylik siyosati', icon: LockKeyhole },
]

/**
 * SettingsNav — Sozlamalar bo'limlarining gorizontal navigatsiyasi
 */
export default function SettingsNav({ activeTab, setActiveTab }) {
  const theme = useSelector((s) => s.themes.theme)

  return (
    <div
      className={`p-3 rounded-2xl border ${
        theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
      }`}
    >
      <nav className="flex min-w-0 gap-1 overflow-x-auto pb-1">
        {SETTINGS_SECTIONS.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-auto shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition text-left whitespace-nowrap ${
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
          )
        })}
      </nav>
    </div>
  )
}
