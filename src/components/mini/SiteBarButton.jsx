import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import { closeMobile } from '../../Redux/Sitebar'

export default function SiteBarButton({ p, n, i }) {
  const isCollapsed = useSelector((state) => state.sidebar.value)
  const theme = useSelector((state) => state.themes.theme)
  const dispatch = useDispatch()
  const location = useLocation()
  const isActive = location.pathname === p

  return (
    <Link
      to={p}
      onClick={() => dispatch(closeMobile())}
      title={isCollapsed ? n : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={`
        flex min-w-0 items-center gap-3 rounded-xl p-3
        transition-colors duration-200
        ${
          isActive
            ? 'bg-amber-400/15 backdrop-blur-3xl text-amber-400'
            : theme
              ? 'text-slate-300 hover:bg-white/10 hover:text-white'
              : 'text-gray-700 hover:bg-amber-400/10 hover:text-amber-700'
        }
        ${isCollapsed ? 'md:justify-center' : ''}
      `}
    >
      <span className="shrink-0 font-bold">{i}</span>

      <span className={`truncate font-bold ${isCollapsed ? 'md:hidden' : ''}`}>{n}</span>
    </Link>
  )
}
