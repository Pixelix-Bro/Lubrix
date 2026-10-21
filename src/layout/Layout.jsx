import { Outlet } from 'react-router-dom'
import Footer from '../components/Footer'
import SiteBar from '../components/SiteBar'
import Top from '../components/Top'
export default function Layout() {
  return (
    <div id='layout'>
      <Top />
      <div className="flex max-w-screen">
        <SiteBar />
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}
