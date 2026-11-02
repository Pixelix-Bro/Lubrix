import { useSelector } from 'react-redux'

export default function RegisterSwiper() {
  const theme = useSelector((state) => state.themes.theme)

  return (
    <div className="relative flex hidden h-screen w-1/2 select-none overflow-hidden bg-black lg:block">
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/start/backgroundWebp.webp"
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-75"
      >
        <source src="/video/checkout.mp4" type="video/mp4" />
      </video>

      <div
        className={`absolute inset-y-0 -left-[5px] z-10 w-32 sm:w-48 lg:w-64 transition-colors duration-300 ${
          theme
            ? 'bg-gradient-to-r to-transparent via-[#090d16]/75 from-[#090d16]'
            : 'bg-gradient-to-r to-transparent via-[#f7fbf8]/75 from-[#f7fbf8]'
        }`}
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[11]  transition-colors duration-300 w-[65%] opacity-60"
        style={{
          backgroundImage: theme
            ? 'radial-gradient(rgba(68, 190, 143, 0.18) 1px, transparent 1px)'
            : 'radial-gradient(rgba(19, 164, 119, 0.2) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'linear-gradient(90deg, transparent, black 45%, transparent)',
        }}
        aria-hidden="true"
      />
      <div
        className={`absolute  transition-colors duration-300 inset-x-0 bottom-0 z-10 h-[55%] ${
          theme
            ? 'bg-gradient-to-t from-[#090d16] via-[#090d16]/85 to-transparent'
            : 'bg-gradient-to-t from-[#f7fbf8] via-[#f7fbf8]/85 to-transparent'
        }`}
        aria-hidden="true"
      />
    </div>
  )
}
