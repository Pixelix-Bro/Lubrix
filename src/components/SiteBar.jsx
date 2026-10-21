import { ChevronLeft, LayoutDashboard } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import media from '../assets/media.png'
import { Opens } from '../Redux/Sitebar'
import SiteBarButton from './mini/SiteBarButton'
export default function SiteBar() {
  const SidebarValue = useSelector((state) => state.sidebar.value)
  const dispatch = useDispatch()
  return (
    <div
      className={`h-screen  ${SidebarValue ? 'w-[80px] transition-all duration-200' : 'w-[13%]'}  transition-all duration-200 fixed  bg-bla hidden sm:inline  bg-white`}
    >
      <span
        onClick={() => dispatch(Opens())}
        className="absolute bg-white z-100 border border-[0.2px] border-black/40 top-[20px] right-[-10px] rounded-[50%] p-[3px] flex justify-center items-center cursor-pointer"
      >
        <ChevronLeft
          size={18}
          className={`text-black/40 transition-transform z-40 ${SidebarValue ? 'rotate-180' : ''}`}
        />
      </span>
      <div className="w-full flex justify-center items-center flex-col relative border-b-[0.1px] border-gray-400 p-[10px]">
        <div className="flex justify-center items-center gap-[2px]">
          <img src={media} alt="SideBar Logo" className="w-[40px] " />
          <div className={` ${SidebarValue ? ' hidden ' : 'inline'} transition-all duration-200 `}>
            <p className="font-[title] tracking-widest text-[20px] max-w-[80%] line-clamp-1">
              LUBRIX
            </p>
            <p className="font-[title] tracking-widest text-[8px] max-w-full line-clamp-1">
              Smarter Oil Change Menegment
            </p>
          </div>
        </div>
        <div className="absolute  h-full  right-0 border-r-[0.1px] border-gray-300" />
      </div>
      <div className="absolute  h-full  right-0 border-r-[0.1px] border-gray-300" />

      <div className="flex flex-col gap-[20px] p-[10px]">
        <SiteBarButton p={'/'} n={'Dashboard'} i={<LayoutDashboard  />} />
      </div>
    </div>
  )
}
