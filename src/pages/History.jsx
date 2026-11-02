import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { lubrixApi } from '../services/api'

const today = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

const currentMonth = () => today().slice(0, 7)

const getRange = ({ period, day, month, from, to }) => {
  let start
  let end
  if (period === 'day' && day) {
    start = new Date(`${day}T00:00:00`)
    end = new Date(start)
    end.setDate(end.getDate() + 1)
  } else if (period === 'month' && month) {
    const [year, monthNumber] = month.split('-').map(Number)
    start = new Date(year, monthNumber - 1, 1)
    end = new Date(year, monthNumber, 1)
  } else if (period === 'range' && from && to) {
    start = new Date(`${from}T00:00:00`)
    end = new Date(`${to}T00:00:00`)
    end.setDate(end.getDate() + 1)
  }
  return start && end ? { from: start.toISOString(), to: end.toISOString() } : null
}

const entityNames = {
  CUSTOMER: 'Mijoz',
  VEHICLE: 'Avtomobil',
  SERVICE: 'Xizmat',
  INVENTORY: 'Ombor',
  REMINDER: 'Eslatma',
  BRANCH: 'Filial',
  STAFF: 'Xodim',
  SETTINGS: 'Sozlama',
  PAYMENT: 'To‘lov',
  TELEGRAM: 'Telegram',
  SYSTEM: 'Tizim',
}

export default function History() {
  const theme = useSelector((state) => state.themes.theme)
  const locale = useSelector((state) => state.language.language)
  const [period, setPeriod] = useState('day')
  const [day, setDay] = useState(today)
  const [month, setMonth] = useState(currentMonth)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  const range = useMemo(
    () => getRange({ period, day, month, from, to }),
    [period, day, month, from, to]
  )

  useEffect(() => {
    if (!range) return undefined
    let active = true
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const response = await lubrixApi.getAuditLogs({
          ...range,
          entity: entity || undefined,
          action: action || undefined,
          search: search.trim() || undefined,
          page,
          limit: 50,
        })
        if (!active) return
        setLogs(response.data?.data || [])
        setTotal(response.data?.total || 0)
        setPages(response.data?.pages || 0)
      } catch (requestError) {
        if (!active) return
        setError(requestError.response?.data?.error || 'Tarix ma’lumotlarini yuklab bo‘lmadi.')
        setLogs([])
        setTotal(0)
        setPages(0)
      } finally {
        if (active) setLoading(false)
      }
    }, 180)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [range, entity, action, search, page])

  const dateLabel = (value) =>
    new Date(value).toLocaleString({ uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }[locale] || 'uz-UZ', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const openTarget = (log) => {
    if (!log.entityId) return null
    if (log.entity === 'CUSTOMER') return `/customers/${log.entityId}`
    if (log.entity === 'SERVICE') return `/services?serviceId=${encodeURIComponent(log.entityId)}`
    if (log.entity === 'VEHICLE') return `/vehicles?vehicleId=${encodeURIComponent(log.entityId)}`
    if (log.entity === 'INVENTORY') return '/inventory'
    if (log.entity === 'PAYMENT') return '/reports'
    return null
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tizim tarixi"
        subtitle="Tashkilotdagi muhim o‘zgarishlar. Audit yozuvlari xavfsizlik uchun o‘zgartirilmaydi."
      />

      <section className="space-y-4 border-b border-border pb-5" aria-label="Tarix filtrlari">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-border p-1">
          {[
            ['day', 'Kunlik'],
            ['month', 'Oylik'],
            ['range', 'Sana oralig‘i'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => {
                setPeriod(value)
                setPage(1)
              }}
              className={`min-h-9 shrink-0 rounded-md px-3 text-xs font-semibold transition ${
                period === value
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {period === 'day' && (
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <CalendarDays size={15} />
              <span className="sr-only">Kun</span>
              <input
                type="date"
                value={day}
                onChange={(event) => {
                  setDay(event.target.value)
                  setPage(1)
                }}
                className="min-h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
              />
            </label>
          )}
          {period === 'month' && (
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <CalendarDays size={15} />
              <span className="sr-only">Oy</span>
              <input
                type="month"
                value={month}
                onChange={(event) => {
                  setMonth(event.target.value)
                  setPage(1)
                }}
                className="min-h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
              />
            </label>
          )}
          {period === 'range' && (
            <div className="grid grid-cols-2 gap-2 xl:col-span-2">
              <label className="sr-only" htmlFor="history-from">
                Boshlanish sanasi
              </label>
              <input
                id="history-from"
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value)
                  setPage(1)
                }}
                className="min-h-10 min-w-0 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
              />
              <label className="sr-only" htmlFor="history-to">
                Tugash sanasi
              </label>
              <input
                id="history-to"
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value)
                  setPage(1)
                }}
                className="min-h-10 min-w-0 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
              />
            </div>
          )}
          <label className="flex min-h-10 items-center gap-2 rounded-md border border-border bg-surface px-3">
            <Search size={15} className="shrink-0 text-text-muted" />
            <span className="sr-only">Tarixdan qidirish</span>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Ism, amal yoki bo‘lim..."
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </label>
          <select
            value={entity}
            onChange={(event) => {
              setEntity(event.target.value)
              setPage(1)
            }}
            aria-label="Bo‘lim bo‘yicha filtrlash"
            className="min-h-10 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
          >
            <option value="">Barcha bo‘limlar</option>
            {Object.entries(entityNames).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value)
              setPage(1)
            }}
            aria-label="Amal bo‘yicha filtrlash"
            className="min-h-10 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
          >
            <option value="">Barcha amallar</option>
            <option value="YARATILDI">Yaratildi</option>
            <option value="YANGILANDI">Yangilandi</option>
            <option value="O‘CHIRILDI">O‘chirildi</option>
          </select>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-text-muted">
          {loading ? 'Yuklanmoqda…' : `${total.toLocaleString()} ta yozuv`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Oldingi sahifa"
            aria-label="Oldingi sahifa"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
            className="grid h-9 w-9 place-items-center rounded-md border border-border text-text-primary disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-16 text-center text-xs text-text-muted">
            {pages ? `${page} / ${pages}` : '0 / 0'}
          </span>
          <button
            type="button"
            title="Keyingi sahifa"
            aria-label="Keyingi sahifa"
            disabled={!pages || page >= pages || loading}
            onClick={() => setPage((current) => current + 1)}
            className="grid h-9 w-9 place-items-center rounded-md border border-border text-text-primary disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border-y border-border">
        <table className="w-full min-w-180 text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs text-text-muted">
            <tr>
              <th className="px-3 py-3 font-medium">Sana-vaqt</th>
              <th className="px-3 py-3 font-medium">Foydalanuvchi</th>
              <th className="px-3 py-3 font-medium">Bo‘lim</th>
              <th className="px-3 py-3 font-medium">Amal</th>
              <th className="px-3 py-3 font-medium">Tafsilot</th>
              <th className="px-3 py-3 font-medium">Ko‘rish</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log._id} className="align-top hover:bg-surface-hover/50">
                <td className="whitespace-nowrap px-3 py-3 text-xs text-text-muted">
                  {dateLabel(log.createdAt)}
                </td>
                <td className="px-3 py-3 font-medium text-text-primary">
                  {log.userName || 'Tizim'}
                </td>
                <td className="px-3 py-3 text-text-primary">
                  {entityNames[log.entity] || log.entity}
                </td>
                <td className="px-3 py-3 text-text-primary">{log.action}</td>
                <td className="max-w-90 px-3 py-3 text-xs text-text-muted">
                  <span className="line-clamp-2">{log.details || 'Tafsilot saqlanmagan'}</span>
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-text-primary hover:bg-surface-hover"
                  >
                    <Clock3 size={13} /> Tafsilot
                  </button>
                </td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-text-muted">
                  Bu sana oralig‘ida tarix yozuvi yo‘q.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedLog && (
        <div
          className="fixed inset-0 z-70 flex justify-end bg-black/50"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedLog(null)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-detail-title"
            className={`flex h-full w-full max-w-lg flex-col border-l border-border p-5 shadow-2xl ${theme ? 'bg-surface text-text-primary' : 'bg-white text-gray-900'}`}
          >
            <header className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="text-xs text-text-muted">{dateLabel(selectedLog.createdAt)}</p>
                <h2 id="history-detail-title" className="mt-1 text-lg font-semibold">
                  {entityNames[selectedLog.entity] || selectedLog.entity} · {selectedLog.action}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                aria-label="Tafsilot panelini yopish"
                className="grid h-9 w-9 place-items-center rounded-md hover:bg-surface-hover"
              >
                <X size={17} />
              </button>
            </header>
            <dl className="grid gap-4 py-5 text-sm">
              <div>
                <dt className="text-xs text-text-muted">Bajargan</dt>
                <dd className="mt-1 font-medium">{selectedLog.userName || 'Tizim'}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Yozuv ID</dt>
                <dd className="mt-1 break-all font-mono text-xs">
                  {selectedLog.entityId || 'Eski yozuvda mavjud emas'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Tafsilot</dt>
                <dd className="mt-1 whitespace-pre-wrap wrap-break-word">
                  {selectedLog.details || 'Tafsilot saqlanmagan'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">So‘rov</dt>
                <dd className="mt-1 break-all font-mono text-xs">
                  {selectedLog.method} {selectedLog.path}
                </dd>
              </div>
            </dl>
            {openTarget(selectedLog) && (
              <Link
                to={openTarget(selectedLog)}
                onClick={() => setSelectedLog(null)}
                className="mt-auto inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white"
              >
                Bog‘liq sahifani ochish
              </Link>
            )}
            <p className="mt-4 text-xs leading-5 text-text-muted">
              Audit yozuvlari xavfsizlik va javobgarlik uchun o‘zgartirilmaydi yoki o‘chirilmaydi.
              Bog‘liq ma’lumotni tegishli bo‘limdan tahrirlang.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
