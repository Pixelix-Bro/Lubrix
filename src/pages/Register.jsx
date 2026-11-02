import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldAlert,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import AuthField from '../components/auth/AuthField'
import AuthShell from '../components/auth/AuthShell'
import { translations } from '../i18n/translations'

export default function Register() {
  const locale = useSelector((state) => state.language.language)
  const dict = translations[locale] || translations.uz
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    organizationName: '',
    email: '',
    phone: '+998',
    password: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    document.title = 'Lubrix | Ro‘yxatdan o‘tish'
  }, [])

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setFieldErrors((current) => ({ ...current, [event.target.name]: '' }))
    setFormError('')
  }

  function handleProceedToPayment(event) {
    event.preventDefault()

    const errors = {}
    if (!form.name.trim()) errors.name = 'Ismingizni kiriting.'
    if (!form.organizationName.trim()) errors.organizationName = 'Tashkilot nomini kiriting.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'To‘g‘ri elektron pochta manzilini kiriting.'
    }
    if (!form.password) errors.password = 'Parolni kiriting.'
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }

    if (form.password.length < 8) {
      setFieldErrors({ password: 'Parol kamida 8 ta belgidan iborat bo‘lishi kerak.' })
      return
    }

    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Kiritilgan parollar mos kelmadi.' })
      return
    }

    // Saqlab qo'yamiz va tarif/to'lov bosqichiga yo'naltiramiz
    try {
      sessionStorage.setItem(
        'lubrix_register_intent',
        JSON.stringify({
          name: form.name.trim(),
          organizationName: form.organizationName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        })
      )
    } catch {
      setFormError('Brauzer sessiya ma’lumotini saqlay olmadi. Brauzer sozlamalarini tekshiring.')
      return
    }

    toast.info(
      'Ma‘lumotlar qabul qilindi. Iltimos, xizmat ko‘rsatish tarifini tanlang va to‘lovni amalga oshiring.'
    )
    navigate('/plans')
  }

  const inputClass =
    'min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-auth-text outline-none placeholder:text-auth-subtle'

  return (
    <AuthShell
      visualLabel="LUBRIX · BIZNESINGIZNI RIVOJLANTIRING"
      visualTitle="Yangi bosqichni birgalikda boshlaymiz."
      visualText="Tarifni tanlang, to‘lovni yakunlang va Lubrix avtoservis platformasini ishga tushiring."
    >
      <section className="w-full" aria-labelledby="register-title">
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-700/15 bg-emerald-700/[0.05] p-3 text-xs leading-relaxed text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/[0.06] dark:text-emerald-100">
          <ShieldAlert size={17} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Obunani faollashtirish</p>
            <p className="mt-0.5 text-[11px] opacity-80">
              Ma'lumotlaringiz to‘ldirilgach, tarif tanlanadi va to‘lov tasdiqlangandan so‘ng
              akkaunt avtomatik faollashtiriladi.
            </p>
          </div>
        </div>

        <h1
          id="register-title"
          className="font-title text-[28px] font-semibold leading-tight text-auth-text sm:text-[32px]"
        >
          Hisob yarating
        </h1>
        <p className="mb-5 mt-2 text-sm leading-6 text-auth-muted">
          Tarifni tanlab, xavfsiz to‘lov bilan avtoservisingizni ishga tushiring.
        </p>

        <form onSubmit={handleProceedToPayment} className="grid gap-3.5" noValidate>
          <AuthField
            id="register-name"
            label={dict.auth.fullName}
            icon={User}
            required
            error={fieldErrors.name}
          >
            <input
              id="register-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Alisher Zokirov"
              required
              className={inputClass}
              aria-invalid={Boolean(fieldErrors.name)}
            />
          </AuthField>

          <AuthField
            id="register-org"
            label="Servis yoki kompaniya nomi"
            icon={Building2}
            required
            error={fieldErrors.organizationName}
          >
            <input
              id="register-org"
              name="organizationName"
              value={form.organizationName}
              onChange={handleChange}
              placeholder="Lubrix Avto Servis"
              required
              className={inputClass}
              aria-invalid={Boolean(fieldErrors.organizationName)}
            />
          </AuthField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AuthField
              id="register-email"
              label={dict.auth.email}
              icon={Mail}
              required
              error={fieldErrors.email}
            >
              <input
                id="register-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="info@servis.uz"
                required
                className={inputClass}
                aria-invalid={Boolean(fieldErrors.email)}
              />
            </AuthField>

            <AuthField id="register-phone" label={dict.auth.phone} icon={Phone}>
              <input
                id="register-phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+998 90 123 45 67"
                className={inputClass}
              />
            </AuthField>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AuthField
              id="register-password"
              label={dict.auth.password}
              icon={LockKeyhole}
              required
              error={fieldErrors.password}
            >
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min 8 ta belgi"
                required
                className={inputClass}
                aria-invalid={Boolean(fieldErrors.password)}
              />

              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </AuthField>

            <AuthField
              id="register-confirm-password"
              label={dict.auth.confirmPassword}
              icon={LockKeyhole}
              required
              error={fieldErrors.confirmPassword}
            >
              <input
                id="register-confirm-password"
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Qayta kiriting"
                required
                className={inputClass}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
              />
            </AuthField>
          </div>

          {formError && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200"
              role="alert"
            >
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="mt-1 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <span>Tarif va to‘lovga o‘tish</span>
            <ArrowRight size={16} />
          </button>

          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-auth-muted sm:text-sm">
            <span>{dict.auth.alreadyHave}</span>
            <Link
              to="/login"
              className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              {dict.auth.signIn}
            </Link>
          </div>
        </form>
      </section>
    </AuthShell>
  )
}
