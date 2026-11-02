import { useSelector } from 'react-redux'

export default function LoginSwiper() {
  const theme = useSelector((state) => state.themes.theme)

  return (
    <div className="relative hidden h-screen w-1/2 select-none overflow-hidden bg-black lg:block">
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/loginPhoto/LoginPhoto.jpg"
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      >
        <source src="/video/login.mp4" type="video/mp4" />
        <source src="/video/login.mp4" type="video/mp4" />
      </video>
      <div
        className={`absolute inset-y-0 right-0 w-32 sm:w-48 lg:w-64 ${
          theme
            ? 'bg-gradient-to-r from-transparent via-[#0f172a]/75 to-[#0f172a]'
            : 'bg-gradient-to-r from-transparent via-[#f7fbf8]/75 to-[#f7fbf8]'
        }`}
        aria-hidden="true"
      />
      <div
        className={`absolute inset-x-0 bottom-0 z-10 h-[55%] ${
          theme
            ? 'bg-gradient-to-t from-[#0f172a] via-[#0f172a]/85 to-transparent'
            : 'bg-linear-to-t from-[#f7fbf8] via-[#f7fbf8]/85 to-transparent'
        }`}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right- z-10 w-[65%] h-[300px] opacity-60"
        style={{
          backgroundImage: theme
            ? 'radial-gradient(rgba(68, 190, 143, 0.18) 1px, transparent 1px)'
            : 'radial-gradient(rgba(19, 164, 119, 0.2) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'linear-gradient(90deg, transparent, black 45%, transparent)',
        }}
        aria-hidden="true"
      />
    </div>
  )
}
