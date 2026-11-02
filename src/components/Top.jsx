import {
  Bell,
  Car,
  ChevronDown,
  Globe,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { languageOptions, translations } from '../i18n/translations'
import { apiCache } from '../Redux/apiCache'
import { logout } from '../Redux/auth'
import { setLanguage } from '../Redux/language'
import { toggleMobile } from '../Redux/Sitebar'
import { activ } from '../Redux/theme'
import { lubrixApi } from '../services/api'
import { lubrixSocket } from '../services/socket'

export default function Top() {
  const isCollapsed = useSelector((state) => state.sidebar.value)
  const theme = useSelector((state) => state.themes.theme)
  const currentLanguage = useSelector((state) => state.language.language)
  const authUser = useSelector((state) => state.auth?.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const [langOpen, setLangOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ customers: [], vehicles: [], products: [] })
  const [reminders, setReminders] = useState([])
  const [activities, setActivities] = useState([])
  const [systemNotifications, setSystemNotifications] = useState([])
  const [notifTab, setNotifTab] = useState('reminders') // 'reminders' | 'activities'

  const dict = translations[currentLanguage] || translations.uz

  const routes = {
    '/': dict.nav?.dashboard || 'Dashboard',
    '/scanner': dict.nav?.scanner || 'Kamera Skaner (ANPR)',
    '/pos': dict.nav?.pos || 'Tezkor Kassa (POS)',
    '/customers': dict.nav?.customers || 'Mijozlar',
    '/vehicles': dict.nav?.vehicles || 'Avtomobillar',
    '/services': dict.nav?.services || 'Xizmatlar',
    '/oil-selector': dict.nav?.oilSelector || 'Moy Tanlash Katalogi',
    '/inspection': dict.nav?.inspection || 'Texnik Ko‘rik',
    '/inventory': dict.nav?.inventory || 'Ombor & Mahsulotlar',
    '/reminders': dict.nav?.reminders || 'Eslatmalar',
    '/marketing': dict.nav?.marketing || 'Marketing & SMS',
    '/reports': dict.nav?.reports || 'Tahlil & Hisobotlar',
    '/history': dict.nav?.history || 'Tizim tarixi',
    '/branches': dict.nav?.branches || 'Filiallar',
    '/staff': dict.nav?.staff || 'Xodimlar',
    '/settings': dict.nav?.settings || 'Tizim Sozlamalari',
  }

  const pageTitle = routes[location.pathname] || 'Lubrix CRM'

  useEffect(() => {
    if (!authUser?.organizationId) return undefined

    lubrixApi
      .getReminders()
      .then((res) => setReminders(res.data?.data || []))
      .catch(() => {})

    lubrixApi
      .getAuditLogs()
      .then((res) => setActivities(res.data?.data || []))
      .catch(() => {})

    lubrixApi
      .getInbox()
      .then((res) => setSystemNotifications(res.data?.data || []))
      .catch(() => {})

    if (authUser?.organizationId) {
      lubrixSocket.setTenant(authUser.organizationId)
    }

    const unsubActivity = lubrixSocket.subscribe('ACTIVITY_LOGGED', (newLog) => {
      setActivities((prev) => [newLog, ...prev.slice(0, 49)])
    })

    const unsubPayment = lubrixSocket.subscribe('PAYMENT_RECEIVED', (payEvent) => {
      dispatch(apiCache.util.invalidateTags(['Dashboard', 'Reports']))
      const payLog = {
        _id: `pay-${Date.now()}`,
        action: 'TO‘LOV',
        entity: 'PAYMENT',
        userName: payEvent.customerName || 'Kassir',
        details: `${payEvent.amount?.toLocaleString()} UZS (${payEvent.provider || 'POS'}) to‘landi`,
        createdAt: new Date().toISOString(),
      }
      setActivities((prev) => [payLog, ...prev.slice(0, 49)])
    })
    const unsubNotification = lubrixSocket.subscribe('IN_APP_NOTIFICATION', (notification) => {
      setSystemNotifications((prev) =>
        [notification, ...prev.filter((item) => item._id !== notification._id)].slice(0, 50)
      )
    })

    return () => {
      unsubActivity?.()
      unsubPayment?.()
      unsubNotification?.()
    }
  }, [authUser?.organizationId, dispatch])

  const handleGlobalSearch = async (val) => {
    setSearchQuery(val)
    if (!val || val.length < 2) {
      setSearchResults({ customers: [], vehicles: [], products: [] })
      return
    }
    try {
      const [custRes, vehRes, prodRes] = await Promise.all([
        lubrixApi.getCustomers(val),
        lubrixApi.getVehicles({ search: val }),
        lubrixApi.getProducts({ search: val }),
      ])
      setSearchResults({
        customers: custRes.data?.data?.slice(0, 5) || [],
        vehicles: vehRes.data?.data?.slice(0, 5) || [],
        products: prodRes.data?.data?.slice(0, 5) || [],
      })
    } catch {
      // ignore
    }
  }

  const handleLogout = async () => {
    try {
      await lubrixApi.logout()
    } finally {
      lubrixSocket.disconnect()
      dispatch(logout())
      navigate('/login')
    }
  }

  const upcomingCount = reminders.filter((r) => r.status === 'scheduled').length
  const unreadNotificationCount = systemNotifications.filter((item) => !item.readAt).length

  const openSystemNotification = async (notification) => {
    setSystemNotifications((current) =>
      current.map((item) =>
        item._id === notification._id
          ? { ...item, readAt: item.readAt || new Date().toISOString() }
          : item
      )
    )
    try {
      await lubrixApi.markInboxItemRead(notification._id)
    } catch {
      // Keep navigation available even if read status cannot be saved.
    }
    const destination = notification.actionUrl
    if (destination?.startsWith('/') && !destination.startsWith('//')) navigate(destination)
    setNotificationsOpen(false)
  }

  const dismissSystemNotification = async (notificationId) => {
    try {
      await lubrixApi.dismissInboxItem(notificationId)
      setSystemNotifications((current) => current.filter((item) => item._id !== notificationId))
    } catch {
      // Leave the notification visible so the user can retry.
    }
  }

  const iconBtn = `flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer ${
    theme
      ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
  }`

  return (
    <>
      <header
        className={`
          fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-3
          border-b px-4 transition-[left,background-color] duration-200 sm:px-6
          ${theme ? 'border-white/10 bg-surface text-white' : 'border-gray-200 bg-white text-gray-900'}
          ${isCollapsed ? 'md:left-20' : 'md:left-60'}
        `}
      >
        {/* Left: Mobile Menu + Page Title */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => dispatch(toggleMobile())}
            aria-label="Menyu"
            className={`md:hidden ${iconBtn}`}
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-lg tracking-tight">
              {pageTitle}
            </h1>
            <p className="hidden text-xs text-slate-400 sm:block">
              Lubrix · Avtoservis Boshqaruv Tizimi
            </p>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Global Quick Search Button */}
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition cursor-pointer ${
              theme
                ? 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                : 'border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-800'
            }`}
            title="Tezkor qidiruv"
          >
            <Search size={14} />
            <span className="hidden sm:inline">Qidirish...</span>
          </button>

          {/* Language Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className={iconBtn}
              title="Tilni o‘zgartirish"
            >
              <Globe size={16} />
            </button>

            {langOpen && (
              <div
                className={`absolute right-0 top-12 z-50 min-w-37.5 rounded-xl border p-1.5 shadow-xl ${
                  theme
                    ? 'border-white/10 bg-surface text-white'
                    : 'border-gray-200 bg-white text-gray-900'
                }`}
              >
                {languageOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      dispatch(setLanguage(opt.value))
                      setLangOpen(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                      currentLanguage === opt.value
                        ? 'bg-primary text-white font-semibold'
                        : theme
                          ? 'hover:bg-white/5'
                          : 'hover:bg-gray-100'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {currentLanguage === opt.value && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => dispatch(activ())}
            className={iconBtn}
            title={theme ? 'Yorug‘ mavzu' : 'Qorong‘i mavzu'}
          >
            {theme ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Notifications Center */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className={`${iconBtn} relative`}
              title="Bildirishnomalar"
            >
              <Bell size={17} />
              {upcomingCount + unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black animate-pulse">
                  {upcomingCount + unreadNotificationCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div
                className={`absolute right-0 top-12 z-50 w-[min(92vw,24rem)] rounded-2xl border p-4 shadow-2xl ${
                  theme
                    ? 'border-white/10 bg-surface text-white'
                    : 'border-gray-200 bg-white text-gray-900'
                }`}
              >
                {/* Header & Tabs */}
                <div className="flex items-center justify-between border-b border-inherit pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNotifTab('system')}
                      className={`text-xs font-bold transition ${notifTab === 'system' ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
                    >
                      Tizim ({unreadNotificationCount})
                    </button>
                    <span className="text-gray-500">·</span>
                    <button
                      onClick={() => setNotifTab('reminders')}
                      className={`text-xs font-bold font-[title] tracking-wider transition ${
                        notifTab === 'reminders' ? 'text-primary' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Eslatmalar ({upcomingCount})
                    </button>
                    <span className="text-gray-500">·</span>
                    <button
                      onClick={() => setNotifTab('activities')}
                      className={`text-xs font-bold font-[title] tracking-wider transition ${
                        notifTab === 'activities'
                          ? 'text-emerald-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Jonli Faoliyat ({activities.length})
                    </button>
                  </div>
                </div>

                {/* Tab 1: Reminders */}
                {notifTab === 'reminders' && (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {reminders.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">
                        Rejalashtirilgan eslatmalar yo‘q
                      </p>
                    ) : (
                      reminders.slice(0, 5).map((r) => (
                        <div
                          key={r._id || r.id}
                          onClick={() => {
                            setNotificationsOpen(false)
                            navigate('/reminders')
                          }}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                            theme
                              ? 'border-white/5 hover:bg-white/5'
                              : 'border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-semibold">{r.customerName || 'Mijoz'}</div>
                          <div className="text-[11px] text-gray-400">{r.vehicleLabel}</div>
                          <div className="text-[10px] text-amber-500 font-mono mt-1">
                            Muddat: {new Date(r.dueAt).toLocaleDateString('uz-UZ')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 2: Live Activity Feed (Backend Sensed Operations) */}
                {notifTab === 'activities' && (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {activities.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">
                        Faoliyatlar jurnali bo‘sh
                      </p>
                    ) : (
                      activities.slice(0, 6).map((act, i) => (
                        <div
                          key={act._id || act.id || i}
                          className={`p-2.5 rounded-xl border text-xs transition ${
                            theme ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              {act.action} · {act.entity}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(act.createdAt).toLocaleTimeString('uz-UZ', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold mt-1 truncate">
                            {act.userName || 'Foydalanuvchi'}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">{act.details}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {notifTab === 'system' && (
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {systemNotifications.length === 0 ? (
                      <p className="py-6 text-center text-xs text-gray-400">
                        Yangi tizim xabari yo‘q
                      </p>
                    ) : (
                      systemNotifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${theme ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'}`}
                        >
                          <button
                            type="button"
                            onClick={() => openSystemNotification(notification)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span
                              className={`block font-semibold ${notification.readAt ? 'text-text-muted' : 'text-text-primary'}`}
                            >
                              {notification.title}
                            </span>
                            <span className="mt-1 block text-text-muted">{notification.body}</span>
                            <time className="mt-1 block text-[10px] text-gray-500">
                              {new Date(notification.createdAt).toLocaleString('uz-UZ')}
                            </time>
                          </button>
                          <button
                            type="button"
                            aria-label={`${notification.title} xabarini yopish`}
                            title="Xabarni yopish"
                            onClick={() => dismissSystemNotification(notification._id)}
                            className="grid h-7 w-7 shrink-0 place-items-center rounded text-gray-400 hover:bg-red-500/10 hover:text-red-400"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="border-t border-inherit pt-2 mt-3 text-center flex justify-between items-center text-xs">
                  <button
                    onClick={() => {
                      setNotificationsOpen(false)
                      navigate('/reminders')
                    }}
                    className="text-primary font-medium hover:underline text-[11px]"
                  >
                    Eslatmalar →
                  </button>
                  {['OWNER', 'ADMIN'].includes(authUser?.role) && (
                    <button
                      onClick={() => {
                        setNotificationsOpen(false)
                        navigate('/history')
                      }}
                      className="text-emerald-400 font-medium hover:underline text-[11px]"
                    >
                      Barcha audit loglari →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative border-l border-inherit pl-2 sm:pl-3">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-white/5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[50%] bg-primary text-white font-bold text-xs shadow-sm overflow-hidden">
                {authUser?.avatarUrl ? (
                  <img
                    src={authUser.avatarUrl}
                    alt={authUser.name || 'User'}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <span>{authUser?.name ? authUser.name.charAt(0).toUpperCase() : 'A'}</span>
                )}
              </div>

              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold leading-tight">{authUser?.name || 'Admin'}</p>
                <p className="text-[10px] text-gray-400">{authUser?.role || 'Boshqaruvchi'}</p>
              </div>

              <ChevronDown size={14} className="hidden sm:block text-gray-400" />
            </button>

            {userMenuOpen && (
              <div
                className={`absolute right-0 top-12 z-50 w-52 rounded-xl border p-1.5 shadow-xl ${
                  theme
                    ? 'border-white/10 bg-surface text-white'
                    : 'border-gray-200 bg-white text-gray-900'
                }`}
              >
                <div className="px-3 py-2 border-b border-inherit mb-1">
                  <p className="text-xs font-bold truncate">{authUser?.name || 'Admin'}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {authUser?.email || 'admin@lubrix.uz'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/settings')
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${
                    theme ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                  }`}
                >
                  <Settings size={14} />
                  <span>{dict.nav?.settings || 'Sozlamalar'}</span>
                </button>

                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition"
                >
                  <LogOut size={14} />
                  <span>{dict.ui?.logout || 'Chiqish'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Text Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden ${
              theme
                ? 'border-white/10 bg-surface text-white'
                : 'border-gray-200 bg-white text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-inherit">
              <Search size={18} className="text-primary shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => handleGlobalSearch(e.target.value)}
                placeholder="Mijoz ismi, telefon, davlat raqami yoki moy markasi..."
                className="w-full bg-transparent outline-none text-sm placeholder:text-gray-500"
              />
              <button
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto space-y-4">
              {searchQuery.length < 2 ? (
                <p className="text-xs text-center text-gray-400 py-6">
                  Qidirish uchun kamida 2 ta belgi kiriting...
                </p>
              ) : searchResults.customers.length === 0 &&
                searchResults.vehicles.length === 0 &&
                searchResults.products.length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-6">
                  Hech qanday natija topilmadi
                </p>
              ) : (
                <>
                  {searchResults.customers.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 block font-[title]">
                        Mijozlar
                      </span>
                      <div className="space-y-1">
                        {searchResults.customers.map((c) => (
                          <div
                            key={c._id || c.id}
                            onClick={() => {
                              setSearchModalOpen(false)
                              navigate(`/customers?search=${encodeURIComponent(c.fullName)}`)
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition ${
                              theme
                                ? 'border-white/5 hover:bg-white/5'
                                : 'border-gray-100 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-primary" />
                              <span className="font-semibold">{c.fullName}</span>
                            </div>
                            <span className="font-mono text-gray-400">
                              {c.phoneE164 || c.phone}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.vehicles.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 block font-[title]">
                        Avtomobillar
                      </span>
                      <div className="space-y-1">
                        {searchResults.vehicles.map((v) => (
                          <div
                            key={v._id || v.id}
                            onClick={() => {
                              setSearchModalOpen(false)
                              navigate(`/vehicles?search=${encodeURIComponent(v.plateNumber)}`)
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition ${
                              theme
                                ? 'border-white/5 hover:bg-white/5'
                                : 'border-gray-100 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Car size={14} className="text-primary" />
                              <span className="font-mono font-bold">{v.plateNumber}</span>
                              <span className="text-gray-400">
                                ({v.make} {v.model})
                              </span>
                            </div>
                            <span className="text-emerald-400 font-mono text-[11px]">
                              {(v.currentOdometerKm || 0).toLocaleString()} km
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voice Assistant Modal */}
    </>
  )
}
