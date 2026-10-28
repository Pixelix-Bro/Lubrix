import { useSelector } from 'react-redux'
import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import SiteBar from '../components/SiteBar'
import Top from '../components/Top'
export default function Layout() {
  const location = useLocation()

  const isSidebarCollapsed = useSelector((state) => state.sidebar.value)

  const theme = useSelector((state) => state.themes.theme)

  const isAuthPage = ['/login', '/register', '/plans', '/checkout'].includes(location.pathname)

  return (
    <div
      className={`
        min-h-screen w-full
        transition-colors duration-200
        ${theme ? 'bg-surface text-text-primary' : 'bg-gray-50 text-gray-900'}
             ${isAuthPage ? 'bg-white' : ''}
      `}
    >
      <Toaster position="top-right" richColors theme={theme ? 'dark' : 'light'} closeButton />
      {!isAuthPage && <Top />}

      <div className="flex min-h-screen">
        {!isAuthPage && <SiteBar />}

        <main
          className={`
            min-w-0 flex-1
            p-3 pt-[76px] sm:p-4 sm:pt-[79px]
            transition-[margin,padding] duration-300
            ${isAuthPage ? 'p-0 pt-0' : isSidebarCollapsed ? 'md:ml-[80px]' : 'md:ml-[230px]'}
          `}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
