import { useSelector } from 'react-redux'
import { Outlet, useLocation } from 'react-router-dom'
import SiteBar from '../components/SiteBar'
import Top from '../components/Top'

export default function Layout() {
  const location = useLocation()

  const isSidebarCollapsed = useSelector((state) => state.sidebar.value)

  const theme = useSelector((state) => state.themes.theme)

  const isAuthPage = ['/login', '/register'].includes(location.pathname)

  return (
    <div
      className={`
        min-h-screen w-full
        transition-colors duration-200
        ${theme ? 'bg-surface text-text-primary' : 'bg-gray-50 text-gray-900'}
             ${isAuthPage ? 'bg-white' : ''}
      `}
    >
      {!isAuthPage && <Top />}

      <div className="flex min-h-screen">
        {!isAuthPage && <SiteBar />}

        <main
          className={`
            min-w-0 flex-1
            p-4 pt-[79px]
            transition-[margin,padding] duration-300
            ${isAuthPage ? 'p-0 pt-0' : isSidebarCollapsed ? 'lg:ml-[4%]' : 'lg:ml-[13%]'}
          `}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
