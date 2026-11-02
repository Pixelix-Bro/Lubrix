import { ArrowLeft, Car, Droplet, Pencil, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { lubrixApi } from '../services/api'

const tabs = [
  ['overview', 'Umumiy'],
  ['services', 'Xizmatlar'],
  ['inspections', 'Ko‘riklar'],
  ['payments', 'To‘lovlar'],
  ['reminders', 'Eslatmalar'],
]

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const formatMoney = (value) => `${(Number(value) || 0).toLocaleString('uz-UZ')} UZS`

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(async () => {
      try {
        const response = await lubrixApi.getCustomerProfile(id)
        if (active) setProfile(response.data?.data || null)
      } catch (requestError) {
        if (active)
          setError(requestError.response?.data?.error || 'Mijoz profilini yuklab bo‘lmadi.')
      } finally {
        if (active) setLoading(false)
      }
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [id])

  if (loading)
    return (
      <div className="py-16 text-center text-sm text-text-muted">Mijoz profili yuklanmoqda…</div>
    )
  if (error || !profile?.customer) {
    return (
      <div className="space-y-4">
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
        >
          {error || 'Mijoz topilmadi.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="min-h-10 rounded-md border border-border px-4 text-sm"
        >
          Mijozlarga qaytish
        </button>
      </div>
    )
  }

  const {
    customer,
    vehicles = [],
    services = [],
    inspections = [],
    transactions = [],
    reminders = [],
    messages = [],
  } = profile
  const activityCount =
    services.length + inspections.length + transactions.length + reminders.length + messages.length

  return (
    <div className="space-y-5">
      <Link
        to="/customers"
        className="inline-flex min-h-9 items-center gap-2 text-sm text-text-muted hover:text-primary"
      >
        <ArrowLeft size={16} /> Mijozlar ro‘yxati
      </Link>

      <section className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
        {customer.photoUrl ? (
          <img
            src={customer.photoUrl}
            alt={`${customer.fullName} rasmi`}
            className="h-16 w-16 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <UserRound size={28} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <PageHeader
            title={customer.fullName}
            subtitle={`${customer.phoneE164 || 'Telefon kiritilmagan'}${customer.email ? ` · ${customer.email}` : ''}`}
          />
          <p className="mt-1 text-xs text-text-muted">
            Mijoz qo‘shilgan: {formatDate(customer.createdAt)} · {activityCount} ta tarix yozuvi
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/services?customerId=${encodeURIComponent(customer._id)}&autoOpen=true`}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-white"
          >
            <Droplet size={15} /> Xizmat qo‘shish
          </Link>
          <Link
            to={`/customers?customerId=${encodeURIComponent(customer._id)}&edit=true`}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm"
          >
            <Pencil size={15} /> Tahrirlash
          </Link>
        </div>
      </section>

      <nav
        className="flex max-w-full gap-1 overflow-x-auto border-b border-border"
        aria-label="Mijoz profili bo‘limlari"
      >
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={activeTab === value}
            onClick={() => setActiveTab(value)}
            className={`min-h-10 shrink-0 border-b-2 px-3 text-sm ${activeTab === value ? 'border-primary font-semibold text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`}
          >
            {label}
            {value === 'services'
              ? ` (${services.length})`
              : value === 'inspections'
                ? ` (${inspections.length})`
                : value === 'payments'
                  ? ` (${transactions.length})`
                  : value === 'reminders'
                    ? ` (${reminders.length + messages.length})`
                    : ''}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
          <section className="space-y-3">
            <h2 className="text-base font-semibold">Avtomobillar</h2>
            {vehicles.length ? (
              vehicles.map((vehicle) => (
                <article
                  key={vehicle._id}
                  className="flex items-center gap-4 border-b border-border py-3"
                >
                  {vehicle.imageUrl ? (
                    <img
                      src={vehicle.imageUrl}
                      alt={`${vehicle.plateNumber} rasmi`}
                      className="h-14 w-20 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="grid h-14 w-20 place-items-center rounded-md border border-border bg-surface text-text-muted">
                      <Car size={22} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-semibold">{vehicle.plateNumber}</p>
                    <p className="truncate text-sm text-text-muted">
                      {[vehicle.make, vehicle.model, vehicle.modelYear].filter(Boolean).join(' ') ||
                        'Model kiritilmagan'}
                    </p>
                    <p className="text-xs text-text-muted">
                      Probeg: {(vehicle.currentOdometerKm || 0).toLocaleString('uz-UZ')} km ·
                      Qo‘shilgan: {formatDate(vehicle.createdAt)}
                    </p>
                  </div>
                  <Link
                    to={`/services?search=${encodeURIComponent(vehicle.plateNumber)}`}
                    className="text-xs font-medium text-primary"
                  >
                    Tarix
                  </Link>
                </article>
              ))
            ) : (
              <p className="border-b border-border py-6 text-sm text-text-muted">
                Hozircha avtomobil biriktirilmagan.
              </p>
            )}
          </section>
          <aside className="space-y-3">
            <h2 className="text-base font-semibold">Mijoz ma’lumotlari</h2>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-xs text-text-muted">Telefon</dt>
                <dd className="mt-1">{customer.phoneE164 || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Email</dt>
                <dd className="mt-1 break-all">{customer.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Til</dt>
                <dd className="mt-1">{customer.preferredLocale || 'uz'}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">SMS roziligi</dt>
                <dd className="mt-1">
                  {customer.optedOutAt
                    ? 'Bekor qilingan'
                    : customer.smsConsentAt
                      ? `Berilgan · ${formatDate(customer.smsConsentAt)}`
                      : 'Berilmagan'}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      )}

      {activeTab === 'services' && (
        <RecordList
          rows={services}
          empty="Xizmat tarixi hozircha yo‘q."
          dateField="serviceDate"
          render={(item) => (
            <>
              <p className="font-semibold">
                {item.oilBrand} · {item.viscosity} · {item.oilQuantity} L
              </p>
              <p className="text-xs text-text-muted">
                {item.vehicle} · {item.plate} · {item.odometerKm?.toLocaleString('uz-UZ')} km
              </p>
              <p className="text-xs text-text-muted">
                {formatMoney(item.price)} · {item.status}
              </p>
            </>
          )}
        />
      )}
      {activeTab === 'inspections' && (
        <RecordList
          rows={inspections}
          empty="Texnik ko‘rik yozuvi yo‘q."
          dateField="inspectedAt"
          render={(item) => (
            <>
              <p className="font-semibold">
                {item.vehicleLabel || item.vehiclePlate} · {item.overallStatus}
              </p>
              <p className="text-xs text-text-muted">
                {item.technicianName} · {item.odometerKm?.toLocaleString('uz-UZ')} km ·{' '}
                {item.points?.filter((point) => point.status !== 'NOT_CHECKED').length || 0}/15 band
                tekshirilgan
              </p>
            </>
          )}
        />
      )}
      {activeTab === 'payments' && (
        <RecordList
          rows={transactions}
          empty="To‘lov tarixi yo‘q."
          dateField="paidAt"
          render={(item) => (
            <>
              <p className="font-semibold">
                {formatMoney(item.amount)} · {item.provider}
              </p>
              <p className="text-xs text-text-muted">
                Holati: {item.paymentStatus} · Chek: {item.receiptNumber || '—'}
              </p>
            </>
          )}
        />
      )}
      {activeTab === 'reminders' && (
        <RecordList
          rows={reminders}
          empty="Eslatma tarixi yo‘q."
          dateField="dueAt"
          render={(item) => (
            <>
              <p className="font-semibold">
                {item.vehicleLabel || 'Avtomobil'} · {item.channel}
              </p>
              <p className="text-xs text-text-muted">
                Holati: {item.status} · Urinishlar: {item.attempts || 0}
              </p>
            </>
          )}
        />
      )}
      {activeTab === 'reminders' && messages.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Yuborilgan xabarlar</h2>
          {messages.map((item) => (
            <article
              key={item._id}
              className="flex flex-wrap justify-between gap-2 border-b border-border py-3 text-sm"
            >
              <span>
                {item.channel} · {item.provider} · {item.status}
              </span>
              <time className="text-xs text-text-muted">{formatDate(item.sentAt)}</time>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

function RecordList({ rows, empty, dateField, render }) {
  if (!rows.length)
    return <p className="border-b border-border py-8 text-sm text-text-muted">{empty}</p>
  return (
    <div className="divide-y divide-border">
      {rows.map((item) => (
        <article key={item._id} className="flex flex-wrap items-start justify-between gap-3 py-4">
          <div className="min-w-0 space-y-1">{render(item)}</div>
          <time className="shrink-0 text-xs text-text-muted">
            {formatDate(item[dateField] || item.createdAt)}
          </time>
        </article>
      ))}
    </div>
  )
}
