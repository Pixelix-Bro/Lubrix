import { Icon } from '@iconify/react'
import { gsap } from 'gsap'
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CardModal from '../components/mini/Cardinput'
import { monthlyPlans } from '../data/root'

const METHODS = [
  { id: 1, name: 'Visa', icon: 'logos:visa' },
  { id: 2, name: 'Mastercard', icon: 'logos:mastercard' },
  { id: 3, name: 'Uzcard', image: '/checkout/uzcard.svg' },
  { id: 4, name: 'Humo', image: '/checkout/humo.png' },
]

// sessionStorage can throw (private mode, blocked storage) — never crash the page for it
const readSession = (key) => {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export default function Checkout() {
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [paying, setPaying] = useState(false)

  // FIX: getItem returns a string, not an array — it can't be destructured.
  const planId = readSession('lubrix-plan')
  const billing = readSession('lubrix-billing') || 'monthly'

  // Assumes monthlyPlans is an array of { id, name | title, price, features? }.
  // Adjust the field names below if your data differs.
  const plan = useMemo(
    () => (monthlyPlans ?? []).find((p) => String(p.id) === String(planId)),
    [planId]
  )
  const planName = plan?.name ?? plan?.title
  const price = plan?.price

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.from('.text-one', {
        y: 60,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power2.out',
      })
      gsap.from('.panel-in', {
        y: 24,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        delay: 0.35,
        ease: 'power2.out',
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])
  const images = ['/checkout/humo.png', '/checkout/uzcard.svg']

  useEffect(() => {
    images.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  return (
    <div ref={rootRef} className="fixed inset-0 h-dvh w-full bg-black">
      <video
        loop
        autoPlay
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="fixed inset-0 h-full w-full object-cover motion-reduce:hidden"
      >
        <source preload="auto" src="/video/checkout.mp4" type="video/mp4" />
      </video>

      <div className="pointer-events-none fixed inset-x-0 top-0 z-[1] h-[200px] bg-gradient-to-b from-black to-transparent sm:h-[300px]" />

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="group fixed left-3 top-3 z-30 flex items-center gap-3 rounded-lg p-3 font-[title] text-sm tracking-[3px] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:left-5 sm:top-5 sm:gap-5 sm:p-5 sm:text-base sm:tracking-[5px]"
      >
        <ArrowLeft
          size={20}
          className="shrink-0 -translate-x-2 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 sm:size-6"
        />
        <span className="transition-transform duration-200 group-hover:translate-x-1">BACK</span>
      </button>

      {/* FIX: the page itself scrolls, so nothing is cut off on phones */}
      <div className="relative z-10 h-full w-full overflow-y-auto text-white">
        <main className="mx-auto flex min-h-full w-full max-w-[1200px] flex-col items-center px-4 pb-10 pt-20 sm:px-6 sm:pt-24 lg:justify-center lg:px-10">
          <h1 className="flex flex-wrap justify-center mt-20 sm:mt-0 gap-x-2 overflow-hidden text-center font-[title] text-[18px] font-thin tracking-[3px] sm:gap-x-3 sm:text-[30px] sm:tracking-[5px] md:text-[36px] lg:text-[40px] absolute top-5">
            <span className="text-one inline-block">LUBRIX</span>
            <span className="text-one inline-block">PLANS</span>
            <span className="text-one inline-block">CHECKOUT</span>
          </h1>

          {/* FIX: grid-cols-2 was fixed — now stacks on mobile */}
          <div className="mt-20 sm:mt-8 grid font-[title] w-full grid-cols-1 gap-5 sm:mt-12 lg:grid-cols-[1.2fr_1fr]">
            {/* Payment methods */}
            <section
              aria-labelledby="pay-title"
              className="panel-in shadow-2xl flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/15 p-5 backdrop-blur-[30px] sm:p-7"
            >
              <div>
                <h2 id="pay-title" className="text-lg font-semibold">
                  Payment method
                </h2>
                <p className="mt-1 text-sm text-white/55">Choose a card type to continue.</p>
              </div>

              <div
                role="radiogroup"
                aria-labelledby="pay-title"
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
              >
                {METHODS.map((m) => {
                  const active = selectedMethod === m.name
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={m.name}
                      title={m.name}
                      onClick={() => setSelectedMethod(m.name)}
                      className={[
                        'relative flex h-[72px] items-center justify-center rounded-xl border p-3 backdrop-blur-md transition duration-300',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
                        active
                          ? 'border-blue-400 bg-white/20 shadow-[0_0_0_1px_rgba(96,165,250,0.6)]'
                          : 'border-white/40 bg-black/20 hover:scale-[1.03] hover:border-white/70 hover:bg-white/10',
                      ].join(' ')}
                    >
                      {m.icon ? (
                        <Icon
                          icon={m.icon}
                          width={75}
                          height={38}
                          className="max-h-full max-w-full"
                        />
                      ) : (
                        <img
                          src={m.image}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      )}
                      {active && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <p className="flex items-center gap-2 text-xs text-white/50">
                <ShieldCheck size={15} className="shrink-0" />
                Payments are encrypted. Your card details are never stored on our servers.
              </p>
            </section>

            {/* Order summary (replaces the "cnjds" placeholder) */}
            <aside
              aria-labelledby="summary-title"
              className="panel-in flex flex-col rounded-2xl border border-white/10 bg-white/15 p-5 backdrop-blur-[30px] sm:p-7"
            >
              <h2 id="summary-title" className="text-lg font-semibold">
                Order summary
              </h2>

              {plan ? (
                <>
                  <dl className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/55">Plan</dt>
                      <dd className="font-medium">{planName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/55">Billing</dt>
                      <dd className="font-medium capitalize">{billing}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/55">Payment method</dt>
                      <dd className="font-medium">{selectedMethod ?? 'Not selected'}</dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex items-baseline justify-between border-t border-white/15 pt-5">
                    <span className="text-white/70">Total</span>
                    <span className="text-2xl font-semibold">{price}$</span>
                  </div>

                  <button
                    type="button"
                    disabled={!selectedMethod}
                    onClick={() => setPaying(true)}
                    className="mt-6 w-full rounded-xl bg-blue-600 py-4 text-sm font-semibold transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {selectedMethod ? `Enter ${selectedMethod} details` : 'Choose a payment method'}
                  </button>
                </>
              ) : (
                <div className="mt-5 flex flex-1 flex-col items-start gap-4">
                  <p className="text-sm text-white/60">
                    No plan selected. Go back and choose a plan to continue.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="rounded-xl bg-white/15 px-5 py-3 text-sm font-medium transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    Choose a plan
                  </button>
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>

      {/* Modal renders through a portal, so it can live outside the layout */}
      {paying && selectedMethod && plan && (
        <CardModal
          key={selectedMethod}
          method={selectedMethod}
          amount={String(price)}
          onClose={() => setPaying(false)}
        />
      )}
    </div>
  )
}
