import { useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom'
import SiteBar from '../components/SiteBar'
import Top from '../components/Top'

export default function Layout() {
  const isSidebarCollapsed = useSelector((state) => state.sidebar.value)
  const theme = useSelector((state) => state.themes.theme)
  return (
    <div className={`min-h-screen ${theme ? 'bg-surface text-white' : 'bg-gray-50'} transition-all duration-200`}>
      <Top />

      <div className="flex">
        <SiteBar />

        <main
          className={`
            mt-[63px]
            min-w-0
            flex-1
            p-4
            transition-all
            duration-300

            ${isSidebarCollapsed ? 'lg:ml-[4%]' : 'lg:ml-[13%]'}
          `}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
