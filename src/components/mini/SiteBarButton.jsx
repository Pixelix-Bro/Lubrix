import { useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'

export default function SiteBarButton({ p, n, i }) {
  const isCollapsed = useSelector((state) => state.sidebar.value)
  const location = useLocation()
  const isActive = location.pathname === p

  return (
    <Link
      to={p}
      title={isCollapsed ? n : undefined}
      className={`
        flex min-w-0 items-center gap-3 rounded-xl p-3
        transition-colors duration-200
        ${
          isActive
            ? 'bg-amber-400/15 backdrop-blur-3xl text-amber-400'
            : 'text-black hover:bg-amber-400/10 hover:text-amber-300'
        }
        ${isCollapsed ? 'justify-center' : ''}
      `}
    >
      <span className="shrink-0 font-bold">{i}</span>

      {!isCollapsed && <span className="truncate font-bold">{n}</span>}
    </Link>
  )
}
