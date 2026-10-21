import { useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom'
import SiteBar from '../components/SiteBar'
import Top from '../components/Top'
export default function Layout() {
  const value = useSelector((state) => state.sidebar.value)
  return (
    <div id="layout" className="flex flex-col relative">
      <Top />
      <div className="flex max-w-screen">
        <SiteBar />
        <div className={`absolute top-[67px] ${value ? 'w-[96%]': 'w-[87%]'} right-0 -z-10 pl-[10px]`}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
