import { useSelector } from 'react-redux'
import { Autoplay } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import { LoginImages } from '../../data/root'
export default function LoginSwiper() {
  const theme = useSelector((state) => state.themes.theme)
  return (
    <div className="w-[50%] hidden  lg:flex h-screen relative overflow-hidden">
      <Swiper
        modules={[Autoplay]}
        navigation={true}
        slidesPerView={1}
        spaceBetween={0}
        loop={true}
        speed={4000}
        autoplay={{
          delay: 4000,
          disableOnInteraction: false,
        }}
        className="login-swiper w-full h-full"
      >
        {LoginImages.map((i) => (
          <SwiperSlide key={i.id}>
            <img src={i.img} alt="Photo" className="w-full h-screen" />
          </SwiperSlide>
        ))}
      </Swiper>
      <div
        className={`absolute bg-gradient-to-b transition-colors duration-200 from-transparent ${theme ? 'to-[#0f172a]' : 'to-white'} h-[500px] w-full bottom-0 left-0 z-50`}
      />
      <div
        className={`absolute bg-gradient-to-b transition-colors duration-200 from-transparent ${theme ? 'to-[#0f172a]' : 'to-white'} h-[500px] w-full bottom-0 left-0 z-50`}
      />
      <div
        className={`absolute bg-gradient-to-b transition-colors duration-200 from-transparent ${theme ? 'to-[#0f172a]' : 'to-white'} h-[500px] -rotate-[90deg]   bottom-0 right-[-730px] w-screen top-0 z-50`}
      />
      <div
        className={`absolute bg-gradient-to-b transition-colors duration-200 from-transparent ${theme ? 'to-[#0f172a]' : 'to-white'} h-[500px] -rotate-[90deg]   bottom-0 right-[-730px] w-screen top-0 z-50`}
      />
    </div>
  )
}
