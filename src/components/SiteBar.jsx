import { useDispatch, useSelector } from 'react-redux'
import logo from '../assets/Logo.png'
import media from '../assets/media.png'

export default function SiteBar() {
  const SidebarValue = useSelector((state) => state.sidebar.value)
  const dispatch = useDispatch()
  return (
    <div className="h-screen w-[16%] fixed  bg-red-700">
      <div className="absolute bg-black z-50 right-[-10px] rounded-[50%]"> </div>
      <img src={SidebarValue ? media : logo} alt="SideBar Logo" />
    </div>
  )
}
