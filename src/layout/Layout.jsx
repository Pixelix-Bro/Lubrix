import { Outlet } from 'react-router-dom'
import Footer from '../components/Footer'
import SiteBar from '../components/SiteBar'
import Top from '../components/Top'
export default function Layout() {
  return (
    <div id="layout" className="flex flex-col relative">
      <Top />
      <div className="flex max-w-screen">
        <SiteBar />
        <div className="pl-[300px]">
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  )
}
