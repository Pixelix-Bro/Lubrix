import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Loader2,
  Pencil,
  Printer,
  Save,
  ShieldAlert,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import PageHeader from '../components/ui/PageHeader'
import { lubrixApi } from '../services/api'

const inspectionPoints = [
  { key: 'engineOil', label: 'Dvigatel moyi holati' },
  { key: 'oilFilter', label: 'Moy filtri' },
  { key: 'airFilter', label: 'Havo filtri' },
  { key: 'cabinFilter', label: 'Salon filtri' },
  { key: 'coolant', label: 'Sovutish suyuqligi' },
  { key: 'brakeFluid', label: 'Tormoz suyuqligi' },
  { key: 'brakePads', label: 'Tormoz kolodkalari' },
  { key: 'brakeDiscs', label: 'Tormoz disklari' },
  { key: 'battery', label: 'Akkumulyator holati' },
  { key: 'chargingSystem', label: 'Generator va elektr tizimi' },
  { key: 'tires', label: 'Shinalar holati' },
  { key: 'tirePressure', label: 'Shinalar bosimi' },
  { key: 'suspension', label: 'Osma va amortizatorlar' },
  { key: 'steering', label: 'Rul boshqaruvi' },
  { key: 'lightsAndSignals', label: 'Chiroqlar va signal tizimi' },
]

const emptyPoints = () =>
  inspectionPoints.map(({ key }) => ({ key, status: 'NOT_CHECKED', note: '', recommendation: '' }))

const statusLabels = {
  NOT_CHECKED: 'Tekshirilmagan',
  GOOD: 'Yaxshi',
  ATTENTION: 'Diqqat',
  CRITICAL: 'Kritik',
}

const getOverallStatus = (points) => {
  if (points.some((point) => point.status === 'CRITICAL')) return 'CRITICAL'
  if (points.some((point) => point.status === 'ATTENTION')) return 'ATTENTION'
  if (points.every((point) => point.status === 'GOOD')) return 'GOOD'
  return 'NOT_CHECKED'
}

export default function InspectionChecklistComplete() {
  const theme = useSelector((state) => state.themes.theme)
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [odometerKm, setOdometerKm] = useState('')
  const [points, setPoints] = useState(emptyPoints)
  const [notes, setNotes] = useState('')
  const [history, setHistory] = useState([])
  const [editingInspectionId, setEditingInspectionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const availableVehicles = useMemo(
    () => vehicles.filter((vehicle) => String(vehicle.customerId) === String(customerId)),
    [vehicles, customerId]
  )
  const overallStatus = getOverallStatus(points)
  const checkedCount = points.filter((point) => point.status !== 'NOT_CHECKED').length

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(async () => {
      try {
        const [customerResponse, vehicleResponse] = await Promise.all([
          lubrixApi.getCustomers('', 1, 100),
          lubrixApi.getVehicles({ limit: 100 }),
        ])
        if (!active) return
        const nextCustomers = customerResponse.data?.data || []
        setCustomers(nextCustomers)
        setVehicles(vehicleResponse.data?.data || [])
      } catch (requestError) {
        if (active)
          setError(requestError.response?.data?.error || 'Mijoz va avtomobillarni yuklab bo‘lmadi')
      } finally {
        if (active) setLoading(false)
      }
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!vehicleId) return undefined
    let active = true
    const timer = window.setTimeout(() => {
      lubrixApi
        .getInspections({ vehicleId, limit: 20 })
        .then((response) => {
          if (active) setHistory(response.data?.data || [])
        })
        .catch((requestError) => {
          if (active)
            setError(requestError.response?.data?.error || 'Ko‘rik tarixini yuklab bo‘lmadi')
        })
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [vehicleId])

  const updatePoint = (index, field, value) => {
    setPoints((current) =>
      current.map((point, pointIndex) =>
        pointIndex === index ? { ...point, [field]: value } : point
      )
    )
  }

  const stopEditingInspection = () => {
    setEditingInspectionId(null)
    setPoints(emptyPoints())
    setNotes('')
    setOdometerKm('')
  }

  const saveInspection = async () => {
    if (!customerId || !vehicleId) {
      toast.error('Mijoz va avtomobilni tanlang')
      return
    }
    if (!Number.isFinite(Number(odometerKm)) || Number(odometerKm) < 0) {
      toast.error('Probegni to‘g‘ri kiriting')
      return
    }
    try {
      setSaving(true)
      setError('')
      const payload = {
        customerId,
        vehicleId,
        odometerKm: Number(odometerKm),
        points,
        notes,
      }
      const response = editingInspectionId
        ? await lubrixApi.updateInspection(editingInspectionId, payload)
        : await lubrixApi.createInspection(payload)
      const report = response.data?.data
      if (!report?._id) throw new Error('Backend ko‘rik hisobotini qaytarmadi')
      setHistory((current) => [report, ...current.filter((item) => item._id !== report._id)])
      toast.success(
        report.status === 'COMPLETED'
          ? 'Texnik ko‘rik saqlandi'
          : 'Qoralama saqlandi; tekshirilmagan bandlar qolgan'
      )
      setEditingInspectionId(null)
      setPoints(emptyPoints())
      setNotes('')
    } catch (requestError) {
      const message =
        requestError.response?.data?.error || requestError.message || 'Ko‘rikni saqlab bo‘lmadi'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const editInspection = (report) => {
    setEditingInspectionId(report._id)
    setCustomerId(report.customerId)
    setVehicleId(report.vehicleId)
    setOdometerKm(String(report.odometerKm))
    setPoints(
      report.points.map(({ key, status, note, recommendation }) => ({
        key,
        status,
        note: note || '',
        recommendation: recommendation || '',
      }))
    )
    setNotes(report.notes || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelInspection = async (report) => {
    if (!window.confirm('Ushbu ko‘rikni bekor qilasizmi? Tarixda saqlanib qoladi.')) return
    try {
      const response = await lubrixApi.cancelInspection(report._id)
      setHistory((current) => current.filter((item) => item._id !== report._id))
      if (editingInspectionId === report._id) stopEditingInspection()
      toast.success('Ko‘rik bekor qilindi')
      return response.data?.data
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'Ko‘rikni bekor qilib bo‘lmadi'
      setError(message)
      toast.error(message)
    }
  }

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none ${theme ? 'border-white/10 bg-white/5 text-white' : 'border-gray-200 bg-white text-gray-900'}`

  return (
    <div className="space-y-5">
      <PageHeader
        title="15 nuqtali texnik ko‘rik"
        subtitle="Natijani saqlash uchun har bir bandni tekshiring; tekshirilmagan bandlar avtomatik yaxshi deb belgilanmaydi."
      />

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <section
        className={`grid grid-cols-1 gap-4 border-b p-4 sm:grid-cols-3 ${theme ? 'border-white/10' : 'border-gray-200'}`}
      >
        <label className="space-y-1 text-xs text-gray-400">
          Mijoz
          <select
            className={inputClass}
            value={customerId}
            disabled={loading}
            onChange={(event) => {
              setCustomerId(event.target.value)
              setVehicleId('')
            }}
          >
            <option value="">Mijozni tanlang</option>
            {customers.map((customer) => (
              <option key={customer._id} value={customer._id}>
                {customer.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-gray-400">
          Avtomobil
          <select
            className={inputClass}
            value={vehicleId}
            disabled={!customerId}
            onChange={(event) => setVehicleId(event.target.value)}
          >
            <option value="">Avtomobilni tanlang</option>
            {availableVehicles.map((vehicle) => (
              <option key={vehicle._id} value={vehicle._id}>
                {vehicle.plateNumber} · {vehicle.make} {vehicle.model}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-gray-400">
          Probeg (km)
          <input
            className={inputClass}
            type="number"
            min="0"
            step="1"
            value={odometerKm}
            onChange={(event) => setOdometerKm(event.target.value)}
          />
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          {overallStatus === 'CRITICAL' ? (
            <ShieldAlert className="text-red-500" size={17} />
          ) : (
            <CheckCircle2 className="text-emerald-500" size={17} />
          )}
          <span>
            {checkedCount}/15 band tekshirildi · {statusLabels[overallStatus]}
          </span>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${theme ? 'border-white/10' : 'border-gray-200'}`}
          >
            <Printer size={15} />
            Chop etish
          </button>
          <button
            type="button"
            onClick={saveInspection}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
            {editingInspectionId ? 'O‘zgarishlarni saqlash' : 'Saqlash'}
          </button>
          {editingInspectionId && (
            <button
              type="button"
              onClick={stopEditingInspection}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${theme ? 'border-white/10' : 'border-gray-200'}`}
            >
              <X size={15} /> Tahrirni bekor qilish
            </button>
          )}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {inspectionPoints.map((point, index) => (
          <article
            key={point.key}
            className={`space-y-3 rounded-xl border p-4 ${theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">
                {index + 1}. {point.label}
              </h2>
              <select
                aria-label={`${point.label} holati`}
                className={`${inputClass} w-36`}
                value={points[index].status}
                onChange={(event) => updatePoint(index, 'status', event.target.value)}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                aria-label={`${point.label} izohi`}
                className={inputClass}
                placeholder="Tekshiruv izohi"
                value={points[index].note}
                onChange={(event) => updatePoint(index, 'note', event.target.value)}
              />
              <input
                aria-label={`${point.label} tavsiyasi`}
                className={inputClass}
                placeholder="Tavsiya (ixtiyoriy)"
                value={points[index].recommendation}
                onChange={(event) => updatePoint(index, 'recommendation', event.target.value)}
              />
            </div>
          </article>
        ))}
      </section>

      <label className="block space-y-1 text-xs text-gray-400">
        Usta xulosasi
        <textarea
          className={inputClass}
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <section className="space-y-3 border-t border-white/10 pt-5">
        <h2 className="text-sm font-semibold">Avtomobilning oldingi ko‘riklari</h2>
        {history.length === 0 ? (
          <p className="text-xs text-gray-400">Bu avtomobil uchun saqlangan ko‘rik yo‘q.</p>
        ) : (
          history.map((report) => (
            <article
              key={report._id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${theme ? 'border-white/10' : 'border-gray-200'}`}
            >
              <div>
                <p className="text-sm font-medium">
                  {new Date(report.inspectedAt).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">
                  {report.technicianName} · {report.odometerKm.toLocaleString()} km
                </p>
              </div>
              <span className="text-xs font-semibold">
                {statusLabels[report.overallStatus]} ·{' '}
                {report.status === 'COMPLETED' ? 'Tugallangan' : 'Qoralama'}
              </span>
              <div className="flex items-center gap-1 print:hidden">
                <button
                  type="button"
                  onClick={() => editInspection(report)}
                  title="Ko‘rikni tahrirlash"
                  aria-label="Ko‘rikni tahrirlash"
                  className="rounded p-2 text-gray-400 hover:text-primary"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => cancelInspection(report)}
                  title="Ko‘rikni bekor qilish"
                  aria-label="Ko‘rikni bekor qilish"
                  className="rounded p-2 text-gray-400 hover:text-red-500"
                >
                  <Ban size={15} />
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
