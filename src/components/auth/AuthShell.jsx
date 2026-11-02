import { Link } from 'react-router-dom'
import logo from '../../assets/media.png'
import AuthHeaderControls from './AuthHeaderControls'

export default function AuthShell({
  children,
  variant = 'split',
  image = '/loginPhoto/LoginPhoto2.jpeg',
  visualLabel = 'LUBRIX · SERVICE OPERATIONS',
  visualTitle = 'Avtoservis boshqaruvi, bir joyda.',
  visualText = 'Mijozlar, avtomobillar va servis ishlarini tartibli boshqaring.',
}) {
  const wide = variant === 'wide'

  return (
    <div className="grid absolute top-0 left-0 w-dvw  min-h-svh grid-rows-[64px_1fr] bg-white font-sans text-[#172033] transition-colors dark:bg-[#080d13] dark:text-slate-100">
      <header className="relative mx-auto flex h-16 w-full items-center justify-center px-4 sm:px-7 absolute ">
        <Link
          to="/login"
          className="absolute left-4 flex items-center gap-2 text-[#172033] no-underline dark:text-slate-100 sm:left-7 md:left-1/2 md:-translate-x-1/2"
          aria-label="Lubrix kirish sahifasi"
        >
          <img src={logo} alt="" className="h-8 w-8 object-contain" />
          <span className="grid gap-0.5">
            <strong className="font-title text-sm font-bold tracking-[0.05em]">LUBRIX</strong>
            <small className="text-[8px] font-semibold tracking-[0.08em] text-slate-500 dark:text-slate-400">
              SERVICE OPERATIONS
            </small>
          </span>
        </Link>
        <AuthHeaderControls />
      </header>

      <div
        className={`mx-auto grid min-h-[calc(100svh-64px)] w-full grid-cols-1 md:grid-cols-[40%_60%] ${wide ? 'max-w-[1920px]' : ''}`}
      >
        <aside
          className="relative hidden min-h-0 overflow-hidden bg-slate-900 md:block"
          aria-label="Lubrix avtoservis platformasi"
        >
          <img
            className="absolute inset-0 h-full w-full object-cover object-[center_46%]"
            src={image}
            alt="Avtoservis mutaxassisi avtomobil ustida ishlamoqda"
            fetchPriority="high"
            decoding="async"
          />
          <div
            className="absolute inset-0 bg-linear-to-t from-[#080d13]/90 via-[#080d13]/20 to-[#080d13]/5"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--auth-dot)_0.7px,transparent_0.85px)] [background-size:18px_18px] [mask-image:linear-gradient(135deg,#000,transparent_82%)]"
            aria-hidden="true"
          />
          <div className="absolute inset-x-7 bottom-8 z-10 max-w-xl text-white sm:inset-x-10 sm:bottom-10 lg:inset-x-12 lg:bottom-12">
            <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.08em] text-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {visualLabel}
            </span>
            <h2 className="mt-3 max-w-lg font-title text-[clamp(26px,3vw,42px)] font-semibold leading-[1.12]">
              {visualTitle}
            </h2>
            <p className="mt-2 max-w-md text-xs leading-6 text-slate-200 sm:text-sm">
              {visualText}
            </p>
            <div className="mt-5 h-0.5 w-12 bg-emerald-400" aria-hidden="true" />
          </div>
        </aside>

        <main className="relative flex min-h-[calc(100svh-64px)] min-w-0 flex-col overflow-y-auto bg-white transition-colors dark:bg-[#0d141d]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--auth-dot)_0.7px,transparent_0.85px)] [background-size:20px_20px] [mask-image:linear-gradient(135deg,#000,transparent_74%)]" />
          <div
            className={`relative z-10 mx-auto flex w-full flex-1 flex-col justify-center px-5 py-8 sm:px-9 md:px-10 lg:px-14 ${wide ? 'max-w-[1040px] justify-start xl:px-12' : 'max-w-[560px]'}`}
          >
            {children}
            <footer className="mt-auto flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-200 pt-3 text-[10px] text-slate-500 dark:border-white/10 dark:text-slate-400">
              <span>© {new Date().getFullYear()} Lubrix</span>
              <span>Avtoservis boshqaruv platformasi</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
