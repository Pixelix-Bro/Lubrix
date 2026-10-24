import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, Check, CreditCard, Eye, EyeOff, Loader2, Lock, Wifi, X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/* ------------------------------------------------------------------ */
/* Brands                                                              */
/* ------------------------------------------------------------------ */

const BRANDS = [
  { id: 'humo', label: 'HUMO', test: /^9860/, from: '#0f3d3a', via: '#0a1f24', to: '#0b1428' },
  { id: 'uzcard', label: 'UZCARD', test: /^8600/, from: '#1b3a6b', via: '#0d1b3a', to: '#101030' },
  { id: 'visa', label: 'VISA', test: /^4/, from: '#1c3563', via: '#0b1428', to: '#11102d' },
  {
    id: 'mastercard',
    label: 'MASTERCARD',
    test: /^(5[1-5]|2[2-7])/,
    from: '#3a1d2e',
    via: '#14111f',
    to: '#0b1428',
  },
]
const DEFAULT_BRAND = {
  id: 'default',
  label: 'LUBRIX',
  from: '#172c50',
  via: '#0b1428',
  to: '#11102d',
}

const detectBrand = (digits) => BRANDS.find((b) => b.test.test(digits)) ?? DEFAULT_BRAND

/* ------------------------------------------------------------------ */
/* Formatting + validation                                             */
/* ------------------------------------------------------------------ */

const formatNumber = (v) =>
  v
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim()

const formatHolder = (v) =>
  v
    .replace(/[^a-zA-Z\s.'-]/g, '')
    .replace(/\s{2,}/g, ' ')
    .toUpperCase()
    .slice(0, 26)

const formatExpiry = (v) => {
  let d = v.replace(/\D/g, '').slice(0, 4)
  // "4" -> "04" so the month is always valid
  if (d.length === 1 && Number(d) > 1) d = `0${d}`
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

const formatCvv = (v) => v.replace(/\D/g, '').slice(0, 3)

const luhn = (digits) => {
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i])
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

const validators = {
  number: (v) => {
    const d = v.replace(/\s/g, '')
    if (!d) return 'Enter your card number'
    if (d.length < 16) return 'Card number must have 16 digits'
    if (!luhn(d)) return 'This card number is not valid'
    return ''
  },
  holder: (v) => {
    const t = v.trim()
    if (!t) return 'Enter the name on the card'
    if (t.length < 3 || !t.includes(' ')) return 'Enter first and last name'
    return ''
  },
  expiry: (v) => {
    if (v.length < 5) return 'Enter the expiry date as MM/YY'
    const month = Number(v.slice(0, 2))
    const year = 2000 + Number(v.slice(3))
    if (month < 1 || month > 12) return 'Month must be between 01 and 12'
    const now = new Date()
    const endOfMonth = new Date(year, month, 0, 23, 59, 59)
    if (endOfMonth < now) return 'This card has expired'
    if (year > now.getFullYear() + 20) return 'Check the expiry year'
    return ''
  },
  cvv: (v) => (v.length < 3 ? 'CVV has 3 digits' : ''),
}

const EMPTY = { number: '', holder: '', expiry: '', cvv: '' }

/* ------------------------------------------------------------------ */
/* Field                                                               */
/* ------------------------------------------------------------------ */

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-medium text-white/65">
        {label}
      </label>
      {children}
      <div className="mt-1.5 min-h-[16px] text-[11px] leading-4" id={`${id}-msg`}>
        {error ? (
          <p role="alert" className="flex items-center gap-1 text-rose-400">
            <AlertCircle size={12} className="shrink-0" />
            {error}
          </p>
        ) : hint ? (
          <p className="text-white/50">{hint}</p>
        ) : null}
      </div>
    </div>
  )
}

const inputClass = (error) =>
  [
    'w-full rounded-xl border bg-black/20 px-4 py-3.5 text-sm text-white outline-none backdrop-blur-md transition',
    'placeholder:text-white/30 focus-visible:ring-2',
    error
      ? 'border-rose-500/60 focus-visible:ring-rose-500/30'
      : 'border-white/40 hover:border-white/70 focus:border-blue-400 focus-visible:ring-blue-400/30',
  ].join(' ')

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function CardModal({
  amount, // e.g. "249 000 UZS" (optional, shown on the pay button)
  onSubmit, // async (card) => void — send to your payment provider, never log it
  buttonLabel = 'Pay now',
  method, // e.g. "Humo" (optional, shown in the header)
  onClose, // if passed, the modal is controlled by the parent: opens on mount, no trigger button
}) {
  const controlled = typeof onClose === 'function'
  const reduce = useReducedMotion()
  const uid = useId()
  const ids = {
    number: `${uid}-number`,
    holder: `${uid}-holder`,
    expiry: `${uid}-expiry`,
    cvv: `${uid}-cvv`,
    title: `${uid}-title`,
  }

  const [open, setOpen] = useState(controlled)
  const [card, setCard] = useState(EMPTY)
  const [touched, setTouched] = useState({})
  const [focused, setFocused] = useState(null)
  const [showCvv, setShowCvv] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | success
  const [submitError, setSubmitError] = useState('')

  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const firstInputRef = useRef(null)

  const digits = card.number.replace(/\s/g, '')
  const brand = useMemo(() => detectBrand(digits), [digits])

  const errors = useMemo(
    () => ({
      number: validators.number(card.number),
      holder: validators.holder(card.holder),
      expiry: validators.expiry(card.expiry),
      cvv: validators.cvv(card.cvv),
    }),
    [card]
  )
  const isValid = !Object.values(errors).some(Boolean)
  const visibleError = (k) => (touched[k] ? errors[k] : '')

  const close = useCallback(() => {
    if (status === 'loading') return
    setOpen(false)
  }, [status])

  const reset = () => {
    setCard(EMPTY)
    setTouched({})
    setFocused(null)
    setShowCvv(false)
    setStatus('idle')
    setSubmitError('')
  }

  const update = (key, raw) => {
    const formatters = {
      number: formatNumber,
      holder: formatHolder,
      expiry: formatExpiry,
      cvv: formatCvv,
    }
    setSubmitError('')
    setCard((p) => ({ ...p, [key]: formatters[key](raw) }))
  }

  const blur = (key) => {
    setFocused((f) => (f === key ? null : f))
    setTouched((t) => ({ ...t, [key]: true }))
  }

  // Auto-jump to the next field when the current one is complete
  const nextField = { number: 'holder', expiry: 'cvv' }
  useEffect(() => {
    if (!open) return
    if (focused === 'number' && validators.number(card.number) === '') {
      document.getElementById(ids[nextField.number])?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.number])
  useEffect(() => {
    if (!open) return
    if (focused === 'expiry' && card.expiry.length === 5 && !errors.expiry) {
      document.getElementById(ids[nextField.expiry])?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.expiry])

  // Escape, focus trap, scroll lock (without layout shift), focus restore
  useEffect(() => {
    if (!open) return

    const prevOverflow = document.body.style.overflow
    const prevPadding = document.body.style.paddingRight
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    const t = setTimeout(() => firstInputRef.current?.focus(), 60)
    const trigger = triggerRef.current

    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPadding
      trigger?.focus()
    }
  }, [open, close])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ number: true, holder: true, expiry: true, cvv: true })
    if (!isValid || status === 'loading') return

    setStatus('loading')
    setSubmitError('')
    try {
      // Replace with your payment provider (Stripe, Payme, Click, Uzum...).
      // Card data should be tokenized by the provider's SDK, not sent to your own server.
      if (onSubmit) await onSubmit({ ...card, number: digits })
      else await new Promise((r) => setTimeout(r, 1200))
      setStatus('success')
    } catch (err) {
      setStatus('idle')
      setSubmitError(err?.message || 'Payment failed. Check your card details and try again.')
    }
  }

  const flipped = focused === 'cvv'
  const dur = reduce ? 0 : 0.5

  return (
    <>
      {!controlled && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-3 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <CreditCard size={18} />
          {buttonLabel}
        </button>
      )}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence
            onExitComplete={() => {
              reset()
              onClose?.()
            }}
          >
            {open && (
              <motion.div
                className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm sm:p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.2 }}
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) close()
                }}
              >
                <motion.div
                  ref={dialogRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={ids.title}
                  initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
                  transition={{ duration: reduce ? 0 : 0.25, ease: 'easeOut' }}
                  className="relative my-auto w-full max-w-[480px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.14] p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-[30px] sm:p-7"
                >
                  {/* Header */}
                  <div className="relative mb-6 flex items-start justify-between gap-4">
                    <div>
                      <h2
                        id={ids.title}
                        className="font-[title] text-lg font-thin uppercase tracking-[4px] sm:text-xl sm:tracking-[5px]"
                      >
                        Add your card
                      </h2>
                      <p className="mt-2 text-sm text-white/55">
                        {method ? `Pay with ${method}` : 'Lubrix secure checkout'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close"
                      className="rounded-xl border border-white/40 bg-black/20 p-2.5 text-white/70 backdrop-blur-md transition hover:border-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {status === 'success' ? (
                    <motion.div
                      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative flex flex-col items-center py-10 text-center"
                      role="status"
                    >
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30">
                        <Check size={30} strokeWidth={2.5} />
                      </div>
                      <h3 className="text-lg font-semibold">Card added</h3>
                      <p className="mt-1 max-w-[280px] text-sm text-white/50">
                        {brand.label !== 'LUBRIX' ? brand.label : 'Your card'} ending in{' '}
                        <span className="font-mono text-white/80">{digits.slice(-4)}</span> is ready
                        to use.
                      </p>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="mt-7 w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                      >
                        Done
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      {/* Live card preview with flip */}
                      <div
                        className="relative mb-6 h-[196px]"
                        style={{ perspective: 1200 }}
                        aria-hidden="true"
                      >
                        <motion.div
                          className="relative h-full w-full"
                          style={{ transformStyle: 'preserve-3d' }}
                          animate={{ rotateY: flipped ? 180 : 0 }}
                          transition={{ duration: dur, ease: [0.4, 0.2, 0.2, 1] }}
                        >
                          {/* Front */}
                          <div
                            className="absolute inset-0 overflow-hidden rounded-2xl border border-white/10 p-5 shadow-xl transition-colors duration-500 [backface-visibility:hidden]"
                            style={{
                              background: `linear-gradient(135deg, ${brand.from}, ${brand.via} 55%, ${brand.to})`,
                            }}
                          >
                            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/10" />
                            <div className="relative flex items-center justify-between">
                              <div className="text-sm font-semibold tracking-[4px]">
                                LUBRIX<span className="text-blue-400">.</span>
                              </div>
                              <Wifi size={22} className="rotate-90 text-white/50" />
                            </div>

                            <div className="relative mt-6 h-7 w-10 rounded-md bg-gradient-to-br from-amber-200/80 to-amber-500/60" />

                            <div className="relative mt-4 font-mono text-[19px] tracking-[0.14em] sm:text-xl">
                              {(card.number || '•••• •••• •••• ••••').padEnd(19, ' ')}
                            </div>

                            <div className="relative mt-4 flex items-end justify-between gap-3">
                              <div className="min-w-0">
                                <div className="mb-0.5 text-[9px] text-white/40">Card holder</div>
                                <div className="truncate text-xs tracking-wider">
                                  {card.holder || 'YOUR NAME'}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="mb-0.5 text-[9px] text-white/40">Expires</div>
                                <div className="font-mono text-xs">{card.expiry || 'MM/YY'}</div>
                              </div>
                              <AnimatePresence mode="wait">
                                <motion.span
                                  key={brand.id}
                                  initial={reduce ? false : { opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="shrink-0 text-xs font-bold italic tracking-wider"
                                >
                                  {brand.label}
                                </motion.span>
                              </AnimatePresence>
                            </div>
                          </div>

                          {/* Back */}
                          <div
                            className="absolute inset-0 overflow-hidden rounded-2xl border border-white/10 shadow-xl [backface-visibility:hidden]"
                            style={{
                              transform: 'rotateY(180deg)',
                              background: `linear-gradient(135deg, ${brand.from}, ${brand.via} 55%, ${brand.to})`,
                            }}
                          >
                            <div className="mt-6 h-11 w-full bg-black/70" />
                            <div className="mt-5 flex items-center gap-3 px-5">
                              <div className="h-9 flex-1 rounded-md bg-white/80" />
                              <div className="flex h-9 w-16 items-center justify-center rounded-md bg-white font-mono text-sm font-semibold tracking-widest text-slate-900">
                                {card.cvv ? '•'.repeat(card.cvv.length) : '•••'}
                              </div>
                            </div>
                            <p className="mt-5 px-5 text-[10px] leading-relaxed text-white/50">
                              The 3-digit security code is printed on the back of your card.
                            </p>
                          </div>
                        </motion.div>
                      </div>

                      {/* Form */}
                      <form onSubmit={handleSubmit} noValidate className="relative">
                        <div className="space-y-1">
                          <Field id={ids.number} label="Card number" error={visibleError('number')}>
                            <input
                              ref={firstInputRef}
                              id={ids.number}
                              value={card.number}
                              onChange={(e) => update('number', e.target.value)}
                              onFocus={() => setFocused('number')}
                              onBlur={() => blur('number')}
                              inputMode="numeric"
                              autoComplete="cc-number"
                              placeholder="0000 0000 0000 0000"
                              aria-invalid={!!visibleError('number')}
                              aria-describedby={`${ids.number}-msg`}
                              className={`${inputClass(visibleError('number'))} font-mono tracking-wider`}
                            />
                          </Field>

                          <Field id={ids.holder} label="Card holder" error={visibleError('holder')}>
                            <input
                              id={ids.holder}
                              value={card.holder}
                              onChange={(e) => update('holder', e.target.value)}
                              onFocus={() => setFocused('holder')}
                              onBlur={() => blur('holder')}
                              autoComplete="cc-name"
                              placeholder="NAME AS ON CARD"
                              aria-invalid={!!visibleError('holder')}
                              aria-describedby={`${ids.holder}-msg`}
                              className={`${inputClass(visibleError('holder'))} tracking-wider`}
                            />
                          </Field>

                          <div className="grid grid-cols-2 gap-4">
                            <Field
                              id={ids.expiry}
                              label="Expiry date"
                              error={visibleError('expiry')}
                            >
                              <input
                                id={ids.expiry}
                                value={card.expiry}
                                onChange={(e) => update('expiry', e.target.value)}
                                onFocus={() => setFocused('expiry')}
                                onBlur={() => blur('expiry')}
                                inputMode="numeric"
                                autoComplete="cc-exp"
                                placeholder="MM/YY"
                                aria-invalid={!!visibleError('expiry')}
                                aria-describedby={`${ids.expiry}-msg`}
                                className={`${inputClass(visibleError('expiry'))} font-mono`}
                              />
                            </Field>

                            <Field id={ids.cvv} label="CVV" error={visibleError('cvv')}>
                              <div className="relative">
                                <input
                                  id={ids.cvv}
                                  type={showCvv ? 'text' : 'password'}
                                  value={card.cvv}
                                  onChange={(e) => update('cvv', e.target.value)}
                                  onFocus={() => setFocused('cvv')}
                                  onBlur={() => blur('cvv')}
                                  inputMode="numeric"
                                  autoComplete="cc-csc"
                                  placeholder="•••"
                                  aria-invalid={!!visibleError('cvv')}
                                  aria-describedby={`${ids.cvv}-msg`}
                                  className={`${inputClass(visibleError('cvv'))} pr-11 font-mono`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowCvv((s) => !s)}
                                  aria-label={showCvv ? 'Hide CVV' : 'Show CVV'}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
                                >
                                  {showCvv ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </Field>
                          </div>
                        </div>

                        {submitError && (
                          <div
                            role="alert"
                            className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
                          >
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            {submitError}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={status === 'loading'}
                          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-sm font-semibold transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {status === 'loading' ? (
                            <>
                              <Loader2 size={17} className="animate-spin" />
                              Processing…
                            </>
                          ) : (
                            <>
                              <Lock size={16} />
                              {amount ? `Pay ${amount}` : 'Pay securely'}
                            </>
                          )}
                        </button>

                        <p className="mt-4 text-center text-[11px] leading-relaxed text-white/50">
                          Your card details are encrypted and never stored on our servers.
                        </p>
                      </form>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
