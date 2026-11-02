import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Car,
  Loader2,
  Mic,
  MicOff,
  Search,
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
  const [mode, setMode] = useState('crm')
  const [speechText, setSpeechText] = useState('')
  const [assistantAnswer, setAssistantAnswer] = useState('')
  const [assistantError, setAssistantError] = useState('')
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

  const {
    isListening,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    toggleListening,
  } = useVoiceSearch({
    onResult: handleVoiceResult,
    lang: activeLang,
  })

  useEffect(() => {
    if (!isOpen) stopListening()
  }, [isOpen, stopListening])

  // Command & Query analyzer
  const performVoiceQuery = async (query) => {
    if (!query || query.trim().length < 2) return
    const q = query.toLowerCase().trim()

    if (mode === 'help') {
      try {
        setIsSearching(true)
        setAssistantError('')
        setAssistantAnswer('')
        const response = await lubrixApi.askAssistant(query.trim())
        setAssistantAnswer(response.data?.data?.answer || '')
      } catch (requestError) {
        setAssistantError(requestError.response?.data?.error || 'AI yordam javob bera olmadi.')
      } finally {
        setIsSearching(false)
      }
      return
    }

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

      const nextResults = {
        customers: custRes.data?.data || [],
        products: prodRes.data?.data || [],
        vehicles: vehRes.data?.data || [],
      }
      setResults(nextResults)
      if (
        !nextResults.customers.length &&
        !nextResults.products.length &&
        !nextResults.vehicles.length
      ) {
        setAssistantError(
          'CRM’da mos yozuv topilmadi. Ism, telefon yoki davlat raqamini qayta ayting.'
        )
      } else {
        setAssistantError('')
      }
    } catch (err) {
      console.error('Voice search error:', err)
      setAssistantError(err.response?.data?.error || 'CRM qidiruvida xatolik yuz berdi.')
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

          <div
            className="mt-4 inline-flex rounded-lg border border-inherit p-1"
            role="group"
            aria-label="Ovozli yordam turi"
          >
            <button
              type="button"
              aria-pressed={mode === 'crm'}
              onClick={() => {
                setMode('crm')
                setAssistantAnswer('')
                setAssistantError('')
              }}
              className={`min-h-9 rounded-md px-3 text-xs font-semibold ${mode === 'crm' ? 'bg-primary text-white' : 'text-gray-400'}`}
            >
              CRM qidirish
            </button>
            <button
              type="button"
              aria-pressed={mode === 'help'}
              onClick={() => {
                setMode('help')
                setAssistantAnswer('')
                setAssistantError('')
              }}
              className={`min-h-9 rounded-md px-3 text-xs font-semibold ${mode === 'help' ? 'bg-primary text-white' : 'text-gray-400'}`}
            >
              AI yordam
            </button>
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

          <p className="text-xs text-gray-400 italic max-w-md min-h-5">
            "
            {transcript ||
              speechText ||
              'Masalan: "Castrol 5W-30", "Azizbek", "01 A 777 AA" yoki "Ombor"'}
            "
          </p>

          {mode === 'help' && (
            <p className="mt-2 max-w-lg text-[11px] leading-5 text-gray-500">
              AI yordam javob berish uchun faqat aytilgan savol matnini server orqali AI
              provayderiga yuboradi; CRM’dagi mijoz yozuvlariga kira olmaydi.
            </p>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void performVoiceQuery(speechText)
            }}
            className="mt-4 flex w-full max-w-lg items-center gap-2"
          >
            <label htmlFor="assistant-query" className="sr-only">
              CRM yoki AI uchun savol
            </label>
            <input
              id="assistant-query"
              value={speechText}
              onChange={(event) => setSpeechText(event.target.value)}
              placeholder={
                mode === 'crm'
                  ? 'Mijoz, telefon, raqam yoki mahsulot...'
                  : 'Lubrix haqida savolingiz...'
              }
              className={`min-h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary ${theme ? 'border-white/10 bg-white/5 text-white' : 'border-gray-200 bg-white text-gray-900'}`}
            />
            <button
              type="submit"
              disabled={isSearching || speechText.trim().length < 2}
              aria-label="Qidirish yoki savol berish"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-white disabled:opacity-50"
            >
              <Search size={16} />
            </button>
          </form>

          {!isSupported && (
            <p className="mt-2 text-xs text-amber-600">
              Bu brauzer ovoz tanishni qo‘llamaydi. Matn orqali qidirishingiz mumkin.
            </p>
          )}
          {(error || assistantError) && (
            <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle size={14} />
              <span>{error || assistantError}</span>
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
          ) : mode === 'help' ? (
            assistantAnswer ? (
              <div
                role="status"
                className={`whitespace-pre-wrap rounded-xl border p-4 text-sm leading-6 ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}
              >
                {assistantAnswer}
              </div>
            ) : null
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
                      <button
                        type="button"
                        key={c._id || c.id}
                        onClick={() => {
                          onClose()
                          navigate(`/customers/${c._id || c.id}`)
                        }}
                        className={`w-full p-3 rounded-xl border text-left text-xs cursor-pointer transition flex items-center justify-between ${
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
                      </button>
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
