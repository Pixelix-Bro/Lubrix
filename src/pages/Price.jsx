import { ArrowLeft, ArrowRight, BadgeCheck, Check, CircleHelp } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/auth/AuthShell'
import { monthlyPlans, yearlyPlans } from '../data/root'

export default function Price() {
  const [active, setActive] = useState('month')
  const [id, setId] = useState(null)
  const selectBillingCycle = (cycle) => {
    setActive(cycle)
    setId(null)
  }

  const plans = active === 'year' ? yearlyPlans : monthlyPlans

  const selectedPlan = plans.find((plan) => plan.id === id)
  const savingsPercent = Math.round((yearlyPlans[0].savings / (monthlyPlans[0].price * 12)) * 100)

  return (
    <AuthShell
      variant="wide"
      visualLabel="LUBRIX · MOSLASHUVCHAN TARIFLAR"
      visualTitle="Servis o‘sishiga mos tarifni tanlang."
      visualText="Oylik yoki yillik hisob-kitobni tanlang. Barcha narxlar amaldagi Lubrix tarif ma’lumotlaridan olinadi."
    >
      <main className="mx-auto w-full max-w-5xl" aria-labelledby="plans-title">
        <Link
          to="/register"
          className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-auth-muted transition hover:text-emerald-700 dark:hover:text-emerald-300"
        >
          <ArrowLeft size={15} /> Ma’lumotlarga qaytish
        </Link>
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[10px] font-bold tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
              OBUNA TARIFLARI
            </p>
            <h1
              id="plans-title"
              className="font-title text-[26px] font-semibold leading-tight text-auth-text sm:text-[32px]"
            >
              Biznesingizga mos tarif
            </h1>
            <p className="mt-2 max-w-lg text-xs leading-5 text-auth-muted sm:text-sm">
              Tarif va hisob-kitob davrini tanlang, keyin to‘lovni yakunlang.
            </p>
          </div>
          <div className="inline-grid w-full grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.03] sm:w-auto">
            <button
              type="button"
              onClick={() => selectBillingCycle('month')}
              aria-pressed={active === 'month'}
              className={`min-h-10 rounded-md px-4 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${active === 'month' ? 'bg-white text-emerald-800 shadow-sm dark:bg-white/10 dark:text-emerald-200' : 'text-auth-muted hover:text-auth-text'}`}
            >
              Oylik
            </button>
            <button
              type="button"
              onClick={() => selectBillingCycle('year')}
              aria-pressed={active === 'year'}
              className={`min-h-10 rounded-md px-4 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${active === 'year' ? 'bg-white text-emerald-800 shadow-sm dark:bg-white/10 dark:text-emerald-200' : 'text-auth-muted hover:text-auth-text'}`}
            >
              Yillik{' '}
              <span className="ml-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                −{savingsPercent}%
              </span>
            </button>
          </div>
        </div>

        <section
          className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3"
          aria-label="Tariflar"
        >
          {plans.map((plan) => {
            const selected = id === plan.id
            return (
              <article
                key={`${active}-${plan.id}`}
                className={`flex min-w-0 flex-col rounded-xl border p-4 transition duration-200 sm:p-5 ${selected ? 'border-emerald-700 bg-emerald-50/60 dark:border-emerald-400/60 dark:bg-emerald-400/[0.06]' : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02]'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-title text-lg font-semibold text-auth-text">{plan.name}</h2>
                    <p className="mt-1 max-w-xs text-[11px] leading-5 text-auth-muted">
                      {plan.description}
                    </p>
                  </div>
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-950' : 'border-slate-300 text-transparent dark:border-white/20'}`}
                  >
                    <Check size={12} />
                  </span>
                </div>
                <div className="mt-5 flex items-baseline gap-1.5 text-auth-text">
                  <span className="font-title text-[30px] font-semibold">${plan.price}</span>
                  <span className="text-[11px] text-auth-muted">
                    / {active === 'year' ? 'yil' : 'oy'}
                  </span>
                </div>
                {active === 'year' && plan.savings > 0 && (
                  <p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-300">
                    Yiliga ${plan.savings} tejaladi
                  </p>
                )}
                <div className="my-4 h-px bg-slate-200 dark:bg-white/10" />
                <ul className="grid flex-1 content-start gap-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-[11px] leading-4 text-auth-muted"
                    >
                      <Check
                        size={14}
                        className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-300"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setId(plan.id)}
                  aria-pressed={selected}
                  className={`mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${selected ? 'bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500' : 'border border-slate-200 text-auth-text hover:border-emerald-700/40 dark:border-white/15 dark:hover:border-emerald-400/40'}`}
                >
                  {selected ? 'Tarif tanlandi' : 'Tarifni tanlash'} <ArrowRight size={14} />
                </button>
              </article>
            )
          })}
        </section>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-auth-muted">
            {selectedPlan ? (
              <>
                <BadgeCheck
                  size={14}
                  className="mr-1 inline text-emerald-700 dark:text-emerald-300"
                />
                {selectedPlan.name} · {active === 'year' ? 'Yillik to‘lov' : 'Oylik to‘lov'}
              </>
            ) : (
              'Davom etish uchun tarifni tanlang.'
            )}
          </p>
          <Link
            to={selectedPlan ? '/checkout' : '#plans-title'}
            onClick={(event) => {
              if (!selectedPlan) {
                event.preventDefault()
                document
                  .querySelector('[aria-label="Tariflar"]')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                return
              }
              sessionStorage.setItem('lubrix-plan', String(selectedPlan.id))
              sessionStorage.setItem('lubrix-billing', active)
              sessionStorage.setItem('plans_id', String(selectedPlan.id))
              sessionStorage.setItem('plans_name', active)
            }}
            aria-disabled={!selectedPlan}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${selectedPlan ? 'bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500' : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/[0.04] dark:text-slate-500'}`}
          >
            Tanlangan tarif bilan davom etish <ArrowRight size={15} />
          </Link>
        </div>

        <section
          className="mt-6 border-t border-slate-200 pt-4 dark:border-white/10"
          aria-labelledby="plans-faq-title"
        >
          <h2
            id="plans-faq-title"
            className="mb-2 flex items-center gap-2 text-xs font-semibold text-auth-text"
          >
            <CircleHelp size={15} className="text-emerald-700 dark:text-emerald-300" /> Tariflar
            haqida
          </h2>
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            <details className="py-3">
              <summary className="cursor-pointer text-[11px] font-medium text-auth-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                Yillik tarif uchun qancha to‘lanadi?
              </summary>
              <p className="mt-2 max-w-2xl text-[11px] leading-5 text-auth-muted">
                Yillik tarif narxi kartada to‘liq yil uchun ko‘rsatilgan. Tejash miqdori oylik va
                yillik tarif narxlaridan hisoblanadi.
              </p>
            </details>
            <details className="py-3">
              <summary className="cursor-pointer text-[11px] font-medium text-auth-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                Akkaunt qachon faollashadi?
              </summary>
              <p className="mt-2 max-w-2xl text-[11px] leading-5 text-auth-muted">
                Akkaunt to‘lov provayderi to‘lovni tasdiqlagandan keyin faollashadi.
              </p>
            </details>
          </div>
        </section>
      </main>
    </AuthShell>
  )
}
