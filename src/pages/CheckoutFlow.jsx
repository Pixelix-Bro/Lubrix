import { Icon } from '@iconify/react'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Lock,
  LockKeyhole,
  Mail,
  Phone,
  User,
  X,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import AuthField from '../components/auth/AuthField'
import AuthShell from '../components/auth/AuthShell'
import { ClickIcon, HumoIcon, PaymeIcon, UzcardIcon } from '../components/payment/CardIcons'
import { monthlyPlans, yearlyPlans } from '../data/root'
import { lubrixApi } from '../services/api'

const METHODS = [
  { id: 'CLICK', name: 'Click Up', provider: 'CLICK', badge: 'Karta yoki QR', Icon: ClickIcon },
  {
    id: 'PAYME',
    name: 'Payme Business',
    provider: 'PAYME',
    badge: 'Karta yoki QR',
    Icon: PaymeIcon,
  },
]

const readPaymentIntent = () => {
  try {
    const saved = sessionStorage.getItem('lubrix_payment_intent')
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

const readRegistrationIntent = () => {
  const empty = { name: '', email: '', organizationName: '', phone: '+998', password: '' }
  try {
    const saved = sessionStorage.getItem('lubrix_register_intent')
    if (!saved) return empty
    const parsed = JSON.parse(saved)
    return {
      ...empty,
      name: parsed.name || '',
      email: parsed.email || '',
      organizationName: parsed.organizationName || '',
      phone: parsed.phone || '+998',
    }
  } catch {
    return empty
  }
}

export default function CheckoutFlow() {
  const navigate = useNavigate()
  const [selectedMethod, setSelectedMethod] = useState('CLICK')
  const [paymentIntent, setPaymentIntent] = useState(readPaymentIntent)
  const [modalOpen, setModalOpen] = useState(() => Boolean(readPaymentIntent()?.paymentId))
  const [startingPayment, setStartingPayment] = useState(false)
  const [paymentFailed, setPaymentFailed] = useState(false)
  const [formData, setFormData] = useState(readRegistrationIntent)

  const selectedPlanId = Number(
    sessionStorage.getItem('lubrix-plan') || sessionStorage.getItem('plans_id')
  )
  const billingCycle =
    sessionStorage.getItem('lubrix-billing') || sessionStorage.getItem('plans_name') || 'month'
  const plan = useMemo(() => {
    const plans = billingCycle === 'year' ? yearlyPlans : monthlyPlans
    return plans.find((item) => item.id === selectedPlanId)
  }, [selectedPlanId, billingCycle])
  const amountText = plan ? `$${Number(plan.price).toFixed(2)}` : '—'

  useEffect(() => {
    if (!formData.email || !formData.organizationName) {
      navigate('/register', { replace: true })
      return
    }
    if (!plan) navigate('/plans', { replace: true })
  }, [formData.email, formData.organizationName, navigate, plan])

  useEffect(() => {
    if (!paymentIntent?.paymentId) return undefined
    let active = true

    const checkPayment = async () => {
      try {
        const response = await lubrixApi.getSignupPayment(paymentIntent.paymentId)
        if (!active) return
        const status = response.data?.data
        if (status?.paymentStatus === 'PAID') {
          sessionStorage.removeItem('lubrix_register_intent')
          sessionStorage.removeItem('lubrix_payment_intent')
          sessionStorage.removeItem('lubrix-plan')
          sessionStorage.removeItem('lubrix-billing')
          sessionStorage.removeItem('plans_id')
          sessionStorage.removeItem('plans_name')
          setModalOpen(false)
          toast.success('To‘lov tasdiqlandi. Akkauntingiz faollashtirildi.')
          navigate('/login', { replace: true, state: { email: formData.email } })
        } else if (status?.paymentStatus === 'FAILED') {
          setPaymentFailed(true)
        }
      } catch {
        // Keep polling while the provider confirms the payment.
      }
    }

    checkPayment()
    const interval = window.setInterval(checkPayment, 3000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [formData.email, navigate, paymentIntent?.paymentId])

  const updateForm = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }))
  }

  const executePayment = async () => {
    if (!plan || startingPayment) return
    if (!formData.name.trim() || !formData.email.trim() || !formData.organizationName.trim()) {
      toast.error('Ism, elektron pochta va tashkilot nomini to‘ldiring')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error('Elektron pochta manzilini tekshiring')
      return
    }
    if (formData.password.length < 8) {
      toast.error('Akkaunt paroli kamida 8 belgidan iborat bo‘lishi kerak')
      return
    }

    try {
      setStartingPayment(true)
      setPaymentFailed(false)
      const response = await lubrixApi.createSignupPayment({
        name: formData.name.trim(),
        email: formData.email.trim(),
        organizationName: formData.organizationName.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        planName: plan.name,
        billingCycle,
        provider: selectedMethod,
      })
      setPaymentIntent(response.data.data)
      sessionStorage.setItem('lubrix_payment_intent', JSON.stringify(response.data.data))
      setModalOpen(true)
    } catch (error) {
      toast.error(error.response?.data?.error || 'To‘lovni boshlashda xatolik yuz berdi.')
    } finally {
      setStartingPayment(false)
    }
  }

  if (!plan) return null

  return (
    <AuthShell
      variant="wide"
      visualLabel="LUBRIX · OBUNANI FAOLLASHTIRISH"
      visualTitle="Xizmat jarayonlaringizni bir joyda boshqaring."
      visualText="Tanlangan tarifni ko‘rib chiqing va mavjud to‘lov provayderlaridan birini tanlang."
    >
      <main className="mx-auto w-full max-w-5xl" aria-labelledby="checkout-title">
        <Link
          to="/plans"
          className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-auth-muted transition hover:text-emerald-700 dark:hover:text-emerald-300"
        >
          <ArrowLeft size={15} /> Tariflarga qaytish
        </Link>
        <header className="mb-5">
          <p className="mb-2 text-[10px] font-bold tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
            TO‘LOV
          </p>
          <h1
            id="checkout-title"
            className="font-title text-[26px] font-semibold leading-tight text-auth-text sm:text-[30px]"
          >
            Obunani yakunlang
          </h1>
          <p className="mt-2 text-xs leading-5 text-auth-muted">
            Ma’lumotlarni tekshiring va to‘lov usulini tanlang.
          </p>
        </header>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(250px,0.65fr)]">
          <div className="order-2 min-w-0 space-y-6 lg:order-1">
            <section aria-labelledby="details-title">
              <h2
                id="details-title"
                className="mb-3 flex items-center gap-2 text-sm font-semibold text-auth-text"
              >
                <User size={16} className="text-emerald-700 dark:text-emerald-300" />
                Hisob ma’lumotlari
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <AuthField id="checkout-name" label="Ism familiya" icon={User} required>
                  <input
                    id="checkout-name"
                    autoComplete="name"
                    value={formData.name}
                    onChange={updateForm('name')}
                    placeholder="Alisher Zokirov"
                    required
                    className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-auth-text outline-none placeholder:text-auth-subtle"
                  />
                </AuthField>
                <AuthField id="checkout-org" label="Tashkilot nomi" icon={Building2} required>
                  <input
                    id="checkout-org"
                    value={formData.organizationName}
                    onChange={updateForm('organizationName')}
                    placeholder="Avtoservis nomi"
                    required
                    className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-auth-text outline-none placeholder:text-auth-subtle"
                  />
                </AuthField>
                <AuthField id="checkout-email" label="Elektron pochta" icon={Mail} required>
                  <input
                    id="checkout-email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={updateForm('email')}
                    placeholder="info@servis.uz"
                    required
                    className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-auth-text outline-none placeholder:text-auth-subtle"
                  />
                </AuthField>
                <AuthField id="checkout-phone" label="Telefon raqami" icon={Phone}>
                  <input
                    id="checkout-phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={updateForm('phone')}
                    placeholder="+998 90 123 45 67"
                    className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-auth-text outline-none placeholder:text-auth-subtle"
                  />
                </AuthField>
                <div className="sm:col-span-2">
                  <AuthField
                    id="checkout-password"
                    label="Akkaunt paroli"
                    icon={LockKeyhole}
                    required
                    hint="Parol kamida 8 belgidan iborat. Brauzerda saqlanmaydi."
                  >
                    <input
                      id="checkout-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={formData.password}
                      onChange={updateForm('password')}
                      placeholder="Kamida 8 belgi"
                      required
                      className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-auth-text outline-none placeholder:text-auth-subtle"
                    />
                  </AuthField>
                </div>
              </div>
            </section>

            <section aria-labelledby="payment-method-title">
              <h2
                id="payment-method-title"
                className="mb-3 flex items-center gap-2 text-sm font-semibold text-auth-text"
              >
                <CreditCard size={16} className="text-emerald-700 dark:text-emerald-300" />
                To‘lov usuli
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {METHODS.map((method) => {
                  const MethodIcon = method.Icon
                  const selected = selectedMethod === method.id
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      aria-pressed={selected}
                      className={`flex min-h-[76px] items-center gap-3 rounded-lg border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${selected ? 'border-emerald-700 bg-emerald-50 dark:border-emerald-400/60 dark:bg-emerald-400/[0.06]' : 'border-slate-200 bg-white hover:border-emerald-700/40 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-emerald-400/40'}`}
                    >
                      <MethodIcon className="h-7 w-11 shrink-0 object-contain" />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-auth-text">
                          {method.name}
                        </span>
                        <span className="mt-1 block text-[10px] leading-4 text-auth-muted">
                          {method.badge}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <span className="text-[10px]">Kartalar:</span>
                <Icon icon="logos:visa" className="h-4 w-auto" aria-label="Visa" />
                <Icon icon="logos:mastercard" className="h-4 w-auto" aria-label="Mastercard" />
                <HumoIcon className="h-4 w-auto" />
                <UzcardIcon className="h-4 w-auto" />
              </div>
            </section>

            <button
              type="button"
              onClick={executePayment}
              disabled={startingPayment}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {startingPayment ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Lock size={16} />
              )}
              {startingPayment ? 'To‘lov tayyorlanmoqda…' : `To‘lovni boshlash · ${amountText}`}
            </button>
          </div>

          <aside className="order-1 border-y border-slate-200 py-4 dark:border-white/10 lg:sticky lg:top-4 lg:order-2 lg:border-x lg:border-t lg:px-4">
            <h2 className="text-sm font-semibold text-auth-text">Buyurtma xulosasi</h2>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-title text-base font-semibold text-auth-text">{plan.name}</p>
                <p className="mt-1 text-[11px] leading-5 text-auth-muted">{plan.description}</p>
              </div>
              <span className="shrink-0 rounded-md bg-emerald-700/[0.07] px-2 py-1 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200">
                {billingCycle === 'year' ? 'Yillik' : 'Oylik'}
              </span>
            </div>
            <ul className="mt-4 grid gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
              {plan.features.slice(0, 4).map((feature) => (
                <li key={feature} className="flex gap-2 text-[11px] leading-4 text-auth-muted">
                  <CheckCircle2
                    size={14}
                    className="shrink-0 text-emerald-700 dark:text-emerald-300"
                  />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-sm dark:border-white/10">
              <span className="font-medium text-auth-muted">Jami</span>
              <span className="font-title text-xl font-semibold text-auth-text">{amountText}</span>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-auth-subtle">
              Akkaunt to‘lov provayderi tasdiqlagandan keyin faollashadi.
            </p>
          </aside>
        </div>
      </main>

      {modalOpen && paymentIntent && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-payment-title"
            className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 text-[#172033] shadow-2xl dark:border-white/10 dark:bg-[#121c27] dark:text-slate-100 sm:p-6"
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Yopish"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={17} />
            </button>
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-emerald-700/[0.08] text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-300">
                {paymentFailed ? <X size={20} /> : <CreditCard size={20} />}
              </div>
              <h2 id="signup-payment-title" className="font-title text-lg font-semibold">
                {paymentFailed ? 'To‘lov yakunlanmadi' : `${paymentIntent.provider} orqali to‘lov`}
              </h2>
              <p className="mt-1 text-xs leading-5 text-auth-muted">
                {paymentFailed
                  ? 'To‘lov tasdiqlanmadi. Yangi to‘lovni boshlashingiz mumkin.'
                  : 'QR kodni bank ilovasi bilan skanerlang yoki to‘lov sahifasini oching.'}
              </p>
              {!paymentFailed && (
                <>
                  <p className="mt-4 font-title text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
                    {Number(paymentIntent.amount).toLocaleString('uz-UZ')} so‘m
                  </p>
                  <div className="mx-auto mt-4 inline-flex rounded-md bg-white p-3">
                    <QRCodeSVG
                      value={paymentIntent.paymentUrl}
                      size={192}
                      level="M"
                      aria-label={`${paymentIntent.provider} to‘lov QR kodi`}
                    />
                  </div>
                  <a
                    href={paymentIntent.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mx-auto mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white transition hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  >
                    To‘lov sahifasini ochish <ExternalLink size={15} />
                  </a>
                  <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-auth-muted">
                    <Loader2 size={13} className="animate-spin" /> To‘lov tasdig‘i kutilmoqda
                  </p>
                </>
              )}
              {paymentFailed && (
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false)
                    executePayment()
                  }}
                  className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white transition hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  Qayta urinish
                </button>
              )}
              {paymentIntent.paymentStatus === 'PAID' && (
                <p className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 size={16} /> To‘lov tasdiqlandi
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </AuthShell>
  )
}
