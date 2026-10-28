import {
  AlertCircle,
  Building,
  CheckCircle,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { lubrixApi } from '../services/api'

export default function Staff() {
  const theme = useSelector((state) => state.themes.theme)
  const [staffList, setStaffList] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('+99890')
  const [role, setRole] = useState('STAFF')
  const [branchId, setBranchId] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const [staffRes, branchRes] = await Promise.all([
        lubrixApi.getStaff(),
        lubrixApi.getBranches(),
      ])
      setStaffList(staffRes.data?.data || [])
      setBranches(branchRes.data?.data || [])
      if (branchRes.data?.data?.length > 0) {
        setBranchId(branchRes.data.data[0]._id || branchRes.data.data[0].id)
      }
    } catch (err) {
      console.error('Error loading staff:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateStaff = async (e) => {
    e.preventDefault()
    if (!name || !email) {
      setError('Ism va email kiritilishi shart')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      await lubrixApi.createStaff({
        name,
        email,
        phone,
        role,
        branchId,
      })

      setIsModalOpen(false)
      setName('')
      setEmail('')
      setPhone('+99890')
      await loadData()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Xatolik yuz berdi')
    } finally {
      setSubmitting(false)
    }
  }

  const getRoleBadge = (roleName) => {
    switch (roleName) {
      case 'OWNER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ShieldAlert size={12} />
            <span>Mulkdor (Owner)</span>
          </span>
        )
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-primary border border-blue-500/20">
            <ShieldCheck size={12} />
            <span>Administrator</span>
          </span>
        )
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <KeyRound size={12} />
            <span>Filial Menejeri</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
            <User size={12} />
            <span>Usta / Operator</span>
          </span>
        )
    }
  }

  const getBranchName = (bId) => {
    const found = branches.find((b) => (b._id || b.id) === bId)
    return found ? found.name : 'Barcha filiallar'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide flex items-center gap-2.5">
            <Users className="text-primary" size={24} />
            <span>Xodimlar va Huquqlar (RBAC)</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Ustalar, menejerlar va administratorlar ro‘yxati hamda ularning tizimdagi huquqlari
          </p>
        </div>

        <button
          onClick={() => {
            setError('')
            setIsModalOpen(true)
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-medium text-sm transition shadow-lg shadow-blue-500/20 shrink-0"
        >
          <UserPlus size={18} />
          <span>Yangi Xodim Qo‘shish</span>
        </button>
      </div>

      {/* Staff Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 size={32} className="animate-spin text-primary mb-3" />
            <p className="text-sm">Xodimlar yuklanmoqda...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users size={44} className="text-gray-500 mb-3" />
            <p className="text-base font-semibold">Xodimlar ro‘yxati bo‘sh</p>
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
                  <th className="px-5 py-4">Xodim F.I.SH</th>
                  <th className="px-5 py-4">Aloqa (Email / Telefon)</th>
                  <th className="px-5 py-4">Tizimdagi Roli</th>
                  <th className="px-5 py-4">Filiali</th>
                  <th className="px-5 py-4">Holat</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  theme ? 'divide-white/5 text-gray-200' : 'divide-gray-100 text-gray-800'
                }`}
              >
                {staffList.map((st) => (
                  <tr
                    key={st._id || st.id}
                    className={`transition ${theme ? 'hover:bg-white/5' : 'hover:bg-gray-50/80'}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                          {st.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold">{st.name}</p>
                          <p className="text-[11px] text-gray-400">
                            Qo‘shilgan:{' '}
                            {st.createdAt
                              ? new Date(st.createdAt).toLocaleDateString('uz-UZ')
                              : '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Mail size={13} className="text-gray-400" />
                        <span>{st.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-gray-400 mt-1">
                        <Phone size={12} className="text-emerald-500" />
                        <span>{st.phone || '—'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">{getRoleBadge(st.role)}</td>

                    <td className="px-5 py-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Building size={13} className="text-gray-400" />
                        <span>{getBranchName(st.branchId)}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle size={11} />
                        <span>Faol</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Staff Modal */}
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
              <UserPlus className="text-primary" size={20} />
              <span>Yangi Xodim Qo‘shish</span>
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Xodim ma'lumotlarini kiriting va tegishli filial hamda rolni biriktiring
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                  Xodim F.I.SH *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jasur Toshmatov"
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition ${
                    theme
                      ? 'border-white/10 bg-white/5 text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Email Manzili *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jasur@lubrix.uz"
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
                    Telefon Raqami
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998901234567"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Roli (Ruxsat darajasi) *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  >
                    <option value="STAFF" className="bg-slate-900 text-white">
                      STAFF (Usta / Xodim)
                    </option>
                    <option value="MANAGER" className="bg-slate-900 text-white">
                      MANAGER (Filial Rahbari)
                    </option>
                    <option value="ADMIN" className="bg-slate-900 text-white">
                      ADMIN (Administrator)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Biriktirilgan Filial
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  >
                    {branches.map((b) => (
                      <option
                        key={b._id || b.id}
                        value={b._id || b.id}
                        className="bg-slate-900 text-white"
                      >
                        {b.name}
                      </option>
                    ))}
                  </select>
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
                    <span>Xodimni Saqlash</span>
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
