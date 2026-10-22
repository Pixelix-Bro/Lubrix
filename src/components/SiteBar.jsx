import { ChevronLeft, LayoutDashboard } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import media from '../assets/media.png'
import { Opens } from '../Redux/Sitebar'
import SiteBarButton from './mini/SiteBarButton'

export default function SiteBar() {
  const SidebarValue = useSelector((state) => state.sidebar.value)
  const dispatch = useDispatch()
  const theme = useSelector((state) => state.themes.theme)

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40 hidden h-screen transition-all duration-200
        border-r border-gray-200  sm:block
        transition-[width] duration-200
          ${theme ? 'bg-surface text-white' : ''}
        ${SidebarValue ? 'w-[80px]' : 'w-[13%]'}
      `}
    >
      <button
        type="button"
        onClick={() => dispatch(Opens())}
        aria-label={SidebarValue ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`absolute ${theme ? ' bg-surface' : ' bg-white'} -right-3 cursor-pointer top-5 z-[100] flex items-center justify-center rounded-full border border-gray-300  p-[3px]`}
      >
        <ChevronLeft
          size={18}
          className={`${theme ? 'text-white ' : 'text-gray-500 '} transition-transform duration-200 ${
            SidebarValue ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div className="flex items-center justify-center border-b border-gray-200 p-2">
        <img src={media} alt="Lubrix logo" className="w-10 shrink-0" />

        {!SidebarValue && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-[title] text-xl tracking-widest">LUBRIX</p>
            <p className="truncate font-[title] text-[8px] tracking-wider">
              Smarter Oil Change Management
            </p>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-3 p-2">
        <SiteBarButton p="/" n="Dashboard" i={<LayoutDashboard size={20} />} />
      </nav>
    </aside>
  )
}
