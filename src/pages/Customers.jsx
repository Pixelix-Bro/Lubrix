import {
  AlertCircle,
  Car,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  User,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { lubrixApi } from '../services/api'
import { lubrixSocket } from '../services/socket'

export default function Customers() {
  const theme = useSelector((state) => state.themes.theme)
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('+998')
  const [email, setEmail] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [carMake, setCarMake] = useState('')
  const [carModel, setCarModel] = useState('')
  const [odometerKm, setOdometerKm] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [custRes, vehRes] = await Promise.all([
        lubrixApi.getCustomers(search),
        lubrixApi.getVehicles(),
      ])
      setCustomers(custRes.data?.data || [])
      setVehicles(vehRes.data?.data || [])
    } catch (err) {
      console.error('Error loading customers:', err)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    void Promise.resolve().then(loadData)

    const unsub = lubrixSocket.subscribe('customer:created', (newCust) => {
      setCustomers((prev) => [newCust, ...prev])
    })
    return () => unsub()
  }, [search, loadData])

  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    if (!fullName || !phone) {
      setError('Mijoz ismi va telefon raqami talab qilinadi')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const res = await lubrixApi.createCustomer({ fullName, phone, email })
      const createdCust = res.data?.data

      // Agar avtomobil ma'lumotlari kiritilgan bo'lsa, uni ham saqlaymiz
      if (plateNumber && createdCust) {
        await lubrixApi.createVehicle({
          customerId: createdCust._id || createdCust.id,
          plateNumber,
          make: carMake,
          model: carModel,
          currentOdometerKm: odometerKm ? Number(odometerKm) : 0,
        })
      }

      setIsModalOpen(false)
      resetForm()
      await loadData()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Xatolik yuz berdi')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFullName('')
    setPhone('+998')
    setEmail('')
    setPlateNumber('')
    setCarMake('')
    setCarModel('')
    setOdometerKm('')
    setError('')
  }

  // Find vehicles for a customer
  const getCustomerVehicles = (custId) => {
    return vehicles.filter(
      (v) =>
        (typeof v.customerId === 'object' ? v.customerId?._id : v.customerId) === custId ||
        v.customerId === custId
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide flex items-center gap-2.5">
            <UserCheck className="text-primary" size={24} />
            <span>Mijozlar Boshqaruvi</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Barcha xizmat oluvchi avto egalari va ularning transport vositalari ro‘yxati
          </p>
        </div>

        <button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-medium text-sm transition shadow-lg shadow-blue-500/20 shrink-0"
        >
          <Plus size={18} />
          <span>Yangi Mijoz</span>
        </button>
      </div>

      {/* Search & Counter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`sm:col-span-2 flex items-center gap-3 px-4 py-3 rounded-xl border ${
            theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
          }`}
        >
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mijoz ismi, telefon raqami yoki avtomobil bo‘yicha qidirish..."
            className="w-full bg-transparent outline-none text-sm placeholder:text-gray-500"
          />
        </div>

        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
            theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
          }`}
        >
          <span className="text-xs sm:text-sm text-gray-400">Jami Mijozlar:</span>
          <span className="font-[title] font-bold text-lg text-primary">
            {customers.length} nafar
          </span>
        </div>
      </div>

      {/* Customers List Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 size={32} className="animate-spin text-primary mb-3" />
            <p className="text-sm">Mijozlar yuklanmoqda...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <User size={44} className="text-gray-500 mb-3" />
            <p className="text-base font-semibold">Hech qanday mijoz topilmadi</p>
            <p className="text-xs text-gray-500 mt-1">
              Yangi mijoz qo‘shing yoki qidiruv so‘zini o‘zgartiring
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead
                className={`text-xs uppercase font-[title] tracking-wider border-b ${
                  theme
                    ? 'border-white/10 bg-white/5 text-gray-400'
                    : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}
              >
                <tr>
                  <th className="px-5 py-4">Mijoz F.I.SH</th>
                  <th className="px-5 py-4">Telefon & Aloqa</th>
                  <th className="px-5 py-4">Avtomobillari</th>
                  <th className="px-5 py-4">SMS Rozilik</th>
                  <th className="px-5 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  theme ? 'divide-white/5 text-gray-200' : 'divide-gray-100 text-gray-800'
                }`}
              >
                {customers.map((c) => {
                  const custVehs = getCustomerVehicles(c._id || c.id)
                  return (
                    <tr
                      key={c._id || c.id}
                      className={`transition ${theme ? 'hover:bg-white/5' : 'hover:bg-gray-50/80'}`}
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-sm">{c.fullName}</div>
                        <div className="text-[11px] text-gray-400">
                          Qo‘shilgan:{' '}
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('uz-UZ') : '—'}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-mono text-xs sm:text-sm">
                          <Phone size={13} className="text-emerald-500 shrink-0" />
                          <span>{c.phoneE164 || c.phone}</span>
                        </div>
                        {c.email && (
                          <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                            <Mail size={12} className="shrink-0" />
                            <span>{c.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {custVehs.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">Avtomobil yo‘q</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {custVehs.map((v) => (
                              <span
                                key={v._id || v.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs"
                              >
                                <Car size={11} />
                                <span>{v.plateNumber}</span>
                                {v.make && (
                                  <span className="text-[10px] text-gray-400">({v.make})</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck size={12} />
                          <span>Rozilik berilgan</span>
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/services?customerId=${c._id || c.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition"
                        >
                          <Wrench size={13} />
                          <span>Xizmatlar</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative transition-all ${
              theme
                ? 'border-white/10 bg-surface text-white'
                : 'border-gray-200 bg-white text-gray-900'
            }`}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-200 p-1"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold font-[title] mb-1 flex items-center gap-2">
              <UserCheck className="text-primary" size={20} />
              <span>Yangi Mijoz Qo‘shish</span>
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Mijoz kontaktlari va birinchi avtomobil ma'lumotlarini kiriting
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Mijoz F.I.SH *
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Sardor Rahim"
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Telefon Raqami *
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998901234567"
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                  Email (ixtiyoriy)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mijoz@gmail.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition ${
                    theme
                      ? 'border-white/10 bg-white/5 text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-900'
                  }`}
                />
              </div>

              {/* Vehicle Subsection */}
              <div
                className={`p-3.5 rounded-xl border ${
                  theme ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-3 font-[title]">
                  <Car size={15} />
                  <span>Avtomobil Ma‘lumotlari (ixtiyoriy)</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Davlat Raqami</label>
                    <input
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                      placeholder="01 A 777 AA"
                      className={`w-full px-3 py-2 rounded-lg border text-xs font-mono uppercase outline-none ${
                        theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Joriy Probeg (km)
                    </label>
                    <input
                      type="number"
                      value={odometerKm}
                      onChange={(e) => setOdometerKm(e.target.value)}
                      placeholder="85000"
                      className={`w-full px-3 py-2 rounded-lg border text-xs outline-none ${
                        theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Marka</label>
                    <input
                      value={carMake}
                      onChange={(e) => setCarMake(e.target.value)}
                      placeholder="Chevrolet, Kia..."
                      className={`w-full px-3 py-2 rounded-lg border text-xs outline-none ${
                        theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Model</label>
                    <input
                      value={carModel}
                      onChange={(e) => setCarModel(e.target.value)}
                      placeholder="Malibu, Cobalt..."
                      className={`w-full px-3 py-2 rounded-lg border text-xs outline-none ${
                        theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-medium border transition ${
                    theme
                      ? 'border-white/10 hover:bg-white/5 text-gray-300'
                      : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-medium text-xs transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Saqlanmoqda...</span>
                    </>
                  ) : (
                    <span>Mijozni Saqlash</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
