import {
  BarChart3,
  Bell,
  Camera,
  Car,
  ChevronLeft,
  ClipboardCheck,
  Droplet,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Settings2,
  Users,
  UserSquare2,
  Warehouse,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import media from '../assets/media.png';
import { translations } from '../i18n/translations';
import { logout } from '../Redux/auth';
import { closeMobile, Opens } from '../Redux/Sitebar';
import SiteBarButton from './mini/SiteBarButton';

export default function SiteBar() {
  const isCollapsed = useSelector((state) => state.sidebar.value);
  const isMobileOpen = useSelector((state) => state.sidebar.mobileOpen);
  const authUser = useSelector((state) => state.auth?.user);
  const theme = useSelector((state) => state.themes.theme);
  const locale = useSelector((state) => state.language.language);
  const dict = translations[locale] || translations.uz;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Menyuni yopish"
          onClick={() => dispatch(closeMobile())}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 h-dvh border-r
          transition-[width,transform,background-color] duration-200 flex flex-col justify-between font-sans
          ${theme ? 'border-white/10 bg-surface text-white' : 'border-gray-200 bg-white text-gray-900'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'w-64 md:w-20' : 'w-64 md:w-60'}
          md:translate-x-0
        `}
      >
        <div className="flex flex-col h-[calc(100vh-75px)]">
          {/* Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => dispatch(Opens())}
            aria-label={isCollapsed ? 'Menyuni kengaytirish' : 'Menyuni ixchamlashtirish'}
            className={`absolute -right-3 top-5 z-60 hidden items-center justify-center rounded-full border p-1 shadow-md md:flex ${
              theme ? 'border-white/10 bg-surface text-white hover:bg-white/10' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft
              size={16}
              className={`transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Logo Header */}
          <div className="flex h-16 items-center gap-2.5 border-b border-inherit px-4 md:px-3 shrink-0">
            <img src={media} alt="Lubrix logo" className="w-8 shrink-0" />

            <div className={`min-w-0 flex-1 ${isCollapsed ? 'md:hidden' : ''}`}>
              <p className="truncate font-brand text-lg font-bold tracking-wider text-primary">
                LUBRIX
              </p>
              <p className="truncate text-[10px] tracking-wide text-gray-400 font-sans">
                Avtoservis Boshqaruv Tizimi
              </p>
            </div>
            <button
              type="button"
              onClick={() => dispatch(closeMobile())}
              aria-label="Menyuni yopish"
              className="ml-auto rounded-lg p-2 text-gray-400 hover:bg-white/10 md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links Sorted by Usage Frequency */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* 1. Dashboard */}
            <SiteBarButton p="/" n={dict.nav.dashboard} i={<LayoutDashboard size={18} />} />

            {/* 2. Fast POS Checkout */}
            <SiteBarButton p="/pos" n={dict.nav.pos} i={<Zap size={18}  />} />

            {/* 3. Services */}
            <SiteBarButton p="/services" n={dict.nav.services} i={<Wrench size={18} />} />

            {/* 4. Customers */}
            <SiteBarButton p="/customers" n={dict.nav.customers} i={<Users size={18} />} />

            {/* 5. Vehicles */}
            <SiteBarButton p="/vehicles" n={dict.nav.vehicles} i={<Car size={18} />} />

            {/* 6. Inventory & Products */}
            <SiteBarButton p="/inventory" n={dict.nav.inventory} i={<Warehouse size={18} />} />

            {/* 7. Reminders */}
            <SiteBarButton p="/reminders" n={dict.nav.reminders} i={<Bell size={18} />} />

            {/* 8. Smart Oil Selector */}
            <SiteBarButton p="/oil-selector" n={dict.nav.oilSelector} i={<Droplet size={18} />} />

            {/* 9. 15-Point Inspection */}
            <SiteBarButton p="/inspection" n={dict.nav.inspection} i={<ClipboardCheck size={18} />} />

            {/* 10. Reports & Analytics */}
            <SiteBarButton p="/reports" n={dict.nav.reports} i={<BarChart3 size={18} />} />

            {/* 11. Marketing */}
            <SiteBarButton p="/marketing" n={dict.nav.marketing} i={<Megaphone size={18}  />} />

            {/* 12. Branches */}
            <SiteBarButton p="/branches" n={dict.nav.branches} i={<MapPin size={18} />} />

            {/* 13. Staff */}
            <SiteBarButton p="/staff" n={dict.nav.staff} i={<UserSquare2 size={18} />} />

            {/* 14. Settings */}
            <SiteBarButton p="/settings" n={dict.nav.settings} i={<Settings2 size={18} />} />
          </nav>
        </div>

        {/* User Mini Profile with Photo Upload Support & Logout */}
        <div className="border-t border-inherit p-2 shrink-0">
          <div
            className={`flex items-center gap-2.5 rounded-xl p-2 transition ${
              theme ? 'bg-white/5' : 'bg-gray-100'
            }`}
          >
            {authUser?.avatarUrl ? (
              <img
                src={authUser.avatarUrl}
                alt="Profile"
                className="h-9 w-9 shrink-0 rounded-lg object-cover border border-primary/50"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">
                {authUser?.name ? authUser.name.charAt(0).toUpperCase() : 'A'}
              </div>
            )}

            <div className={`min-w-0 flex-1 ${isCollapsed ? 'md:hidden' : ''}`}>
              <p className="truncate text-xs font-semibold leading-tight">
                {authUser?.name || 'Administrator'}
              </p>
              <p className="truncate text-[10px] text-gray-400">
                {authUser?.role || 'OWNER'}
              </p>
            </div>

            <button
              onClick={handleLogout}
              title={dict.ui.logout}
              className={`p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition ${
                isCollapsed ? 'md:hidden' : ''
              }`}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
