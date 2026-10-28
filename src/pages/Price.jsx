import { gsap } from 'gsap'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { monthlyPlans, yearlyPlans } from '../data/root'

export default function Price() {
  const [active, setActive] = useState('month')
  const [id, setId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const animation = gsap.from('.text-one', {
      y: 100,
      opacity: 0, 
      duration: 1,
      stagger: 0.15,
      ease: 'power2.out',
    })

    return () => animation.kill()
  }, [])

  useEffect(() => {
    setId(null)
  }, [active])

  const plans = active === 'year' ? yearlyPlans : monthlyPlans

  const selectedPlan = plans.find((plan) => plan.id === id)
  return (
    <div className="fixed font-[title] inset-0 h-dvh w-full overflow-hidden bg-black">
      <video
        loop
        autoPlay
        muted
        playsInline
        poster="/start/backgroundWebp.webp"
        className="fixed inset-0 h-full w-full object-cover"
      >
        <source src="/video/background.mp4" type="video/mp4" />
      </video>

      <div className="pointer-events-none fixed inset-x-0 top-0 z-[1] h-[200px] bg-gradient-to-b from-black to-transparent sm:h-[300px]" />

      <div className="relative z-10 h-full w-full overflow-x-hidden overflow-y-auto text-white">
        <button
          onClick={() => navigate(-1)}
          className="group absolute left-3 top-3 z-20 flex items-center gap-3 p-3 font-[title] text-sm tracking-[3px] sm:left-5 sm:top-5 sm:gap-5 sm:p-5 sm:text-base sm:tracking-[5px]"
        >
          <ArrowLeft
            size={20}
            className="shrink-0 -translate-x-2 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:size-6"
          />

          <span className="transition-transform duration-200 group-hover:translate-x-1">BACK</span>
        </button>

        {selectedPlan && (
          <Link
            to="/checkout"
            onClick={() => {
              sessionStorage.setItem('lubrix-plan', String(selectedPlan.id))
              sessionStorage.setItem('lubrix-billing', active)
            }}
            className="group absolute right-3 top-3 z-20 flex items-center gap-2 p-3 font-[title] text-sm font-bold tracking-[3px] sm:right-5 sm:top-5 sm:gap-3 sm:p-5 sm:text-base sm:tracking-[5px]"
          >
            <span>NEXT</span>

            <ArrowRight
              size={20}
              className="transition-transform duration-200 group-hover:translate-x-1 sm:size-6"
            />
          </Link>
        )}
        <main className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col items-center px-4 pb-6 pt-24 sm:px-6 sm:pt-28 lg:min-h-0 lg:h-full lg:justify-center lg:px-10 lg:pb-4 lg:pt-20">
          <div className="flex w-full flex-col items-center gap-5 text-center sm:gap-6">
            <h1 className="flex flex-wrap absolute top-5 justify-center gap-x-2 overflow-hidden font-[title] text-[22px] font-thin tracking-[3px] sm:gap-x-3 sm:text-[30px] sm:tracking-[5px] md:text-[36px] lg:text-[40px]">
              <span className="text-one inline-block">LUBRIX</span>
              <span className="text-one inline-block">PLANS</span>
              <span className="text-one inline-block">PRICE</span>
            </h1>

            <div className="flex items-center justify-center gap-3 sm:gap-5">
              <button
                type="button"
                onClick={() => setActive('month')}
                aria-pressed={active === 'month'}
                className={`rounded-4xl border px-4 py-2.5 font-[title] text-[12px] tracking-[3px] backdrop-blur-[4px] transition-colors duration-200 sm:px-5 sm:py-3 sm:text-base sm:tracking-[5px] md:tracking-[7px] ${
                  active === 'month' ? 'border-white/60 bg-white/20' : 'border-white/20 bg-black/20'
                }`}
              >
                MONTH
              </button>

              <button
                type="button"
                onClick={() => setActive('year')}
                aria-pressed={active === 'year'}
                className={`rounded-4xl border px-4 py-2.5 font-[title] text-[12px] tracking-[3px] backdrop-blur-[4px] transition-colors duration-200 sm:px-5 sm:py-3 sm:text-base sm:tracking-[5px] md:tracking-[7px] ${
                  active === 'year' ? 'border-white/60 bg-white/20' : 'border-white/20 bg-black/20'
                }`}
              >
                YEAR <span className="text-[10px] sm:text-sm">-20%</span>
              </button>
            </div>
          </div>

          <div className="mt-10 grid w-full grid-cols-1 items-stretch gap-5 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:mt-16 lg:grid-cols-3 lg:gap-[30px]">
            {plans.map((plan) => {
              const selected = id === plan.id

              return (
                <button
                  type="button"
                  key={plan.id}
                  onClick={() => setId(plan.id)}
                  aria-pressed={selected}
                  className={`relative flex min-w-0 flex-col gap-5 overflow-hidden rounded-2xl border p-5 text-left backdrop-blur-[30px] transition-colors duration-200 sm:p-6 ${
                    selected
                      ? 'border-white/70 bg-white/10'
                      : 'border-white/20 bg-black/30 hover:border-white/40'
                  }`}
                >
                  <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-white/50 sm:right-5 sm:top-5 sm:h-[30px] sm:w-[30px]">
                    {selected && <Check size={17} className="text-white" />}
                  </div>

                  <span className="pr-10 font-[title] text-2xl font-bold tracking-[3px] sm:text-[30px]">
                    {plan.name}
                  </span>

                  <span className="line-clamp-2 break-words font-[dic] text-sss tracking-[2px] sm:tracking-[3px]">
                    {plan.description}
                  </span>

                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-[title] text-3xl sm:text-[40px]">${plan.price}</span>

                    <span className="font-[dic] text-sm tracking-[2px] text-white/70 sm:text-base">
                      / {active === 'year' ? 'year' : 'month'}
                    </span>
                  </div>

                  <div className="border border-white/30" />

                  <div className="flex flex-1 flex-col gap-4">
                    {plan.features?.map((feature) => (
                      <span
                        key={feature}
                        className="flex items-start gap-3 break-words font-[dic] text-sm sm:gap-4 sm:text-base"
                      >
                        <Check size={19} className="mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </span>
                    ))}
                  </div>

                  <div className="border border-white/30" />

                  <div className="flex items-center justify-between gap-3 font-[title] text-sm tracking-[2px] sm:text-base sm:tracking-[3px]">
                    <span>{selected ? 'SELECTED' : 'SELECT PLAN'}</span>

                    <ArrowRight
                      size={20}
                      className={`shrink-0 transition-transform duration-200 ${
                        selected ? 'translate-x-1' : ''
                      }`}
                    />
                  </div>
                </button>
              )
            })}
          </div>

          <div className="h-6 shrink-0 sm:h-10" />
        </main>
      </div>
    </div>
  )
}
