import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Car,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useVoiceSearch } from '../hooks/useVoiceSearch'
import { lubrixApi } from '../services/api'

export default function VoiceAssistantModal({ isOpen, onClose }) {
  const theme = useSelector((state) => state.themes.theme)
  const navigate = useNavigate()

  const [activeLang, setActiveLang] = useState('uz-UZ')
  const [speechText, setSpeechText] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState({
    customers: [],
    products: [],
    vehicles: [],
  })

  const handleVoiceResult = async (finalText) => {
    setSpeechText(finalText)
    await performVoiceQuery(finalText)
  }

  const { isListening, transcript, error, startListening, stopListening, toggleListening } =
    useVoiceSearch({
      onResult: handleVoiceResult,
      lang: activeLang,
    })

  useEffect(() => {
    if (isOpen) {
      startListening(activeLang)
    } else {
      stopListening()
    }
  }, [isOpen, activeLang, startListening, stopListening])

  // Command & Query analyzer
  const performVoiceQuery = async (query) => {
    if (!query || query.trim().length < 2) return
    const q = query.toLowerCase().trim()

    // 1. Check for quick vocal navigation commands
    if (q.includes('ombor') || q.includes('mahsulot') || q.includes('sklad')) {
      navigate('/inventory')
      onClose()
      return
    }
    if (q.includes('xizmat') || q.includes('servis')) {
      navigate('/services')
      onClose()
      return
    }
    if (q.includes('kamera') || q.includes('skaner') || q.includes('raqam')) {
      navigate('/scanner')
      onClose()
      return
    }
    if (q.includes('kassa') || q.includes('pos')) {
      navigate('/pos')
      onClose()
      return
    }

    // 2. Perform simultaneous search across Customers, Products, and Vehicles
    try {
      setIsSearching(true)
      const [custRes, prodRes, vehRes] = await Promise.all([
        lubrixApi.getCustomers(query),
        lubrixApi.getProducts({ search: query }),
        lubrixApi.getVehicles({ search: query }),
      ])

      setResults({
        customers: custRes.data?.data || [],
        products: prodRes.data?.data || [],
        vehicles: vehRes.data?.data || [],
      })
    } catch (err) {
      console.error('Voice search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden relative transition-all ${
          theme ? 'border-white/10 bg-surface text-white' : 'border-gray-200 bg-white text-gray-900'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-inherit">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Mic size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
                <span>Ovozli Qidiruv</span>
              </h2>
              <p className="text-xs text-slate-400">
                Mikrofon orqali mahsulot, mijoz yoki avtomobil qidirish
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[11px] text-gray-400">Ovoz tili:</span>
            {[
              { code: 'uz-UZ', label: 'O‘zbekcha' },
              { code: 'ru-RU', label: 'Русский' },
              { code: 'en-US', label: 'English' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setActiveLang(lang.code)
                  startListening(lang.code)
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  activeLang === lang.code
                    ? 'bg-primary text-white shadow-sm'
                    : 'border border-inherit text-gray-400 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mic Visualizer & Input Section */}
        <div className="p-6 flex flex-col items-center justify-center text-center">
          <div className="relative mb-4">
            {isListening && (
              <div className="absolute inset-0 -m-3 rounded-full bg-primary/20 animate-ping" />
            )}
            <button
              onClick={toggleListening}
              className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full transition-transform active:scale-95 shadow-xl ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-primary hover:bg-blue-600 text-white'
              }`}
            >
              {isListening ? <Mic size={32} /> : <MicOff size={32} />}
            </button>
          </div>

          <p className="text-sm font-medium mb-1">
            {isListening ? (
              <span className="text-primary font-[title] tracking-wide animate-pulse">
                🎙️ Gapiring... Eshitmoqdaman
              </span>
            ) : (
              <span className="text-gray-400">Tugmani bosib gapiring</span>
            )}
          </p>

          <p className="text-xs text-gray-400 italic max-w-md min-h-[20px]">
            "
            {transcript ||
              speechText ||
              'Masalan: "Castrol 5W-30", "Azizbek", "01 A 777 AA" yoki "Ombor"'}
            "
          </p>

          {error && (
            <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results Container */}
        <div className="px-6 pb-6 max-h-72 overflow-y-auto space-y-4">
          {isSearching ? (
            <div className="flex items-center justify-center py-6 text-gray-400 text-xs">
              <Loader2 size={18} className="animate-spin text-primary mr-2" />
              <span>Qidirilmoqda...</span>
            </div>
          ) : (
            <>
              {/* Products Section */}
              {results.products.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-2 font-[title]">
                    <Boxes size={14} />
                    <span>Topilgan Mahsulotlar ({results.products.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.products.map((p) => (
                      <div
                        key={p._id || p.id}
                        onClick={() => {
                          onClose()
                          navigate(`/inventory?search=${encodeURIComponent(p.name || p.brand)}`)
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                          theme
                            ? 'border-white/5 bg-white/5 hover:border-primary/50'
                            : 'border-gray-200 bg-gray-50 hover:border-primary/50'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">{p.name || `${p.brand} ${p.viscosity}`}</p>
                          <p className="text-[11px] text-gray-400">
                            {p.brand} ·{' '}
                            <span className="font-mono text-amber-400">{p.viscosity}</span>
                          </p>
                        </div>
                        <ArrowRight size={14} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers Section */}
              {results.customers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 mb-2 font-[title]">
                    <User size={14} />
                    <span>Topilgan Mijozlar ({results.customers.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.customers.map((c) => (
                      <div
                        key={c._id || c.id}
                        onClick={() => {
                          onClose()
                          navigate(`/customers?search=${encodeURIComponent(c.fullName)}`)
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                          theme
                            ? 'border-white/5 bg-white/5 hover:border-purple-500/50'
                            : 'border-gray-200 bg-gray-50 hover:border-purple-500/50'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">{c.fullName}</p>
                          <p className="text-[11px] font-mono text-emerald-400">
                            {c.phoneE164 || c.phone}
                          </p>
                        </div>
                        <ArrowRight size={14} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicles Section */}
              {results.vehicles.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 font-[title]">
                    <Car size={14} />
                    <span>Topilgan Avtomobillar ({results.vehicles.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.vehicles.map((v) => (
                      <div
                        key={v._id || v.id}
                        onClick={() => {
                          onClose()
                          navigate(`/services?search=${encodeURIComponent(v.plateNumber)}`)
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                          theme
                            ? 'border-white/5 bg-white/5 hover:border-blue-500/50'
                            : 'border-gray-200 bg-gray-50 hover:border-blue-500/50'
                        }`}
                      >
                        <div>
                          <p className="font-mono font-bold text-primary">{v.plateNumber}</p>
                          <p className="text-[11px] text-gray-400">
                            {v.make} {v.model} ({(v.currentOdometerKm || 0).toLocaleString()} km)
                          </p>
                        </div>
                        <ArrowRight size={14} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
