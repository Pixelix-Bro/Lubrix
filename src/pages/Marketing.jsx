import { AlertCircle, Loader2, Megaphone, Send, Sparkles, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { lubrixApi } from '../services/api'

const maskPhone = (phone = '') =>
  phone.length > 6 ? `${phone.slice(0, 4)}••••${phone.slice(-2)}` : 'Raqam yashirilgan'

export default function Marketing() {
  const theme = useSelector((state) => state.themes.theme)
  const [targetSegment, setTargetSegment] = useState('DUE_SOON')
  const [smsMessage, setSmsMessage] = useState(
    'Lubrix: Hurmatli {customer_name}, avtomobilingiz uchun moy almashtirish muddati yaqinlashmoqda. Batafsil ma’lumot uchun servisimizga murojaat qiling.'
  )
  const [isSending, setIsSending] = useState(false)
  const [preview, setPreview] = useState({ count: 0, sample: [] })
  const [previewLoading, setPreviewLoading] = useState(true)
  const [campaigns, setCampaigns] = useState([])
  const [campaignResult, setCampaignResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true)
      setError('')
      try {
        const [previewResponse, campaignResponse] = await Promise.all([
          lubrixApi.previewCampaign(targetSegment),
          lubrixApi.getCampaigns(),
        ])
        if (!active) return
        setPreview(previewResponse.data?.data || { count: 0, sample: [] })
        setCampaigns(campaignResponse.data?.data || [])
      } catch (requestError) {
        if (active)
          setError(
            requestError.response?.data?.error || 'Kampaniya ma’lumotlarini yuklab bo‘lmadi.'
          )
      } finally {
        if (active) setPreviewLoading(false)
      }
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [targetSegment])

  const handleLaunchCampaign = async () => {
    if (!preview.count || !smsMessage.trim()) return
    const confirmed = window.confirm(
      `${preview.count} nafar SMS roziligi qayd etilgan mijozga kampaniya yuborilsinmi?`
    )
    if (!confirmed) return

    setIsSending(true)
    setError('')
    setCampaignResult(null)
    try {
      const response = await lubrixApi.launchCampaign({
        name: `Marketing · ${new Date().toLocaleDateString('uz-UZ')}`,
        segment: targetSegment,
        message: smsMessage,
      })
      const result = response.data
      setCampaignResult(result)
      if (result?.data) setCampaigns((current) => [result.data, ...current])
      if (result?.testMode) {
        toast.info(
          'Sinov rejimi: SMS yetkazilmadi. Provider javobi faqat test sifatida qayd etildi.'
        )
      } else {
        toast.success(`Kampaniya yakunlandi: ${result?.data?.sentCount || 0} ta yuborildi.`)
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Kampaniyani yuborib bo‘lmadi.')
      toast.error(requestError.response?.data?.error || 'Kampaniyani yuborib bo‘lmadi.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide flex items-center gap-2.5">
            <Megaphone className="text-primary" size={24} />
            <span>SMS & Marketing Kampaniyalari</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Mijozlarga ommaviy aksiyalar, chegirmalar va qaytaruvchi SMS xabarnomalar yuborish
          </p>
        </div>

        {campaignResult && (
          <span
            className={`px-4 py-2 rounded-lg border text-xs font-semibold ${campaignResult.testMode ? 'border-amber-500/20 bg-amber-500/10 text-amber-500' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'}`}
          >
            {campaignResult.testMode
              ? `Sinov yakunlandi · ${campaignResult.data?.recipientCount || 0} recipient`
              : `Yuborildi · ${campaignResult.data?.sentCount || 0} · Xato · ${campaignResult.data?.failedCount || 0}`}
          </span>
        )}
      </div>

      {/* Campaign Form & Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className={`p-6 rounded-3xl border space-y-4 ${
              theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
            }`}
          >
            <h2 className="text-base font-bold font-[title] border-b border-inherit pb-3 flex items-center gap-2 text-primary">
              <Target size={18} />
              <span>Yangi Marketing Kampaniyasi</span>
            </h2>

            {/* Segment Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 font-[title]">
                Maqsadli Auditoriya Segmenti:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  {
                    id: 'DUE_SOON',
                    title: 'Muddati yaqin',
                    desc: 'Keyingi 14 kun ichida',
                  },
                  {
                    id: 'OVERDUE_90',
                    title: '90+ kun bo‘lgan',
                    desc: 'Uzoq vaqtdan beri kelmagan',
                  },
                  {
                    id: 'ALL',
                    title: 'Rozilik berganlar',
                    desc: 'Barcha ruxsatli mijozlar',
                  },
                  { id: 'VIP', title: 'Doimiy mijozlar', desc: '3 martadan ko‘p tashrif buyurgan' },
                ].map((seg) => (
                  <button
                    type="button"
                    key={seg.id}
                    onClick={() => setTargetSegment(seg.id)}
                    aria-pressed={targetSegment === seg.id}
                    className={`p-3 rounded-2xl border cursor-pointer transition ${
                      targetSegment === seg.id
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-inherit text-gray-400 hover:text-white'
                    }`}
                  >
                    <p className="font-[title] text-xs">{seg.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{seg.desc}</p>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400" aria-live="polite">
                {previewLoading
                  ? 'Rozilikli recipientlar tekshirilmoqda…'
                  : `${preview.count} ta rozilikli recipient`}
              </p>
            </div>

            {/* Template Message */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-400 font-[title]">
                  SMS Xabar Matni:
                </label>
                <span className="text-[11px] text-gray-400 font-mono">
                  {smsMessage.length} belgi (1 SMS)
                </span>
              </div>
              <textarea
                rows={4}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl border text-xs sm:text-sm outline-none transition ${
                  theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
                }`}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Avtomatik qo‘yiladi:{' '}
                <code className="text-primary font-mono">{`{customer_name}`}</code>
              </p>
            </div>

            {/* Ready Templates Buttons */}
            <div>
              <label className="block text-[11px] text-gray-400 mb-1.5 font-[title]">
                Tayyor Shablonlar:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Mavsumiy 20% Chegirma',
                  'Moy almashtirganga Filtr Bepul',
                  'Tezkor diagnostika sovg‘a',
                ].map((tmpl) => (
                  <button
                    key={tmpl}
                    onClick={() =>
                      setSmsMessage(
                        `Lubrix: Hurmatli {customer_name}, siz uchun maxsus "${tmpl}" aksiyasi! Filialimizga tashrif buyuring. Manzil: Lubrix Servis`
                      )
                    }
                    className="px-2.5 py-1 rounded-lg border border-inherit text-[11px] text-gray-400 hover:text-white transition"
                  >
                    + {tmpl}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400"
              >
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            {/* Launch Button */}
            <button
              onClick={handleLaunchCampaign}
              disabled={isSending || previewLoading || !preview.count || !smsMessage.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-primary hover:bg-blue-600 text-white font-[title] font-bold text-sm tracking-wider transition shadow-xl shadow-blue-500/25 disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Xabarlar yuborilmoqda...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>KAMPANIYANI BOSHLASH ({preview.count} TA)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Preview Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className={`p-6 rounded-3xl border space-y-4 ${
              theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
            }`}
          >
            <h2 className="text-base font-bold font-[title] border-b border-inherit pb-3 text-emerald-400 flex items-center gap-2">
              <Sparkles size={18} />
              <span>Smartfon Ekrani Ko‘rinishi</span>
            </h2>

            {/* Phone Mockup Screen */}
            <div className="max-w-[280px] mx-auto rounded-3xl border-4 border-gray-700 bg-black p-4 text-white shadow-2xl">
              <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
              <div className="text-[10px] text-gray-400 text-center mb-4">
                SMS namunasi · jo‘natuvchi sozlamada belgilanadi
              </div>

              <div className="p-3 rounded-2xl bg-blue-600/90 text-white text-xs leading-relaxed shadow-md">
                {smsMessage.replace('{customer_name}', 'Azizbek')}
              </div>
              <div className="text-[9px] text-gray-500 text-right mt-1">
                Yetkazish holati providerga bog‘liq
              </div>
            </div>

            {/* Target Stats */}
            <div className="pt-2 text-xs space-y-2 text-gray-400">
              <div className="flex items-center justify-between">
                <span>Qabul qiluvchilar soni:</span>
                <span className="font-bold text-white font-mono">
                  {previewLoading ? '…' : `${preview.count} nafar`}
                </span>
              </div>
              {preview.sample?.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-[10px] uppercase text-gray-500">Namunaviy recipientlar</p>
                  <ul className="space-y-1">
                    {preview.sample.slice(0, 3).map((recipient) => (
                      <li key={recipient.id} className="flex justify-between gap-2 text-xs">
                        <span className="truncate">{recipient.fullName}</span>
                        <span className="shrink-0 font-mono text-gray-500">
                          {maskPhone(recipient.phoneE164)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="border-t border-border pt-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <History size={16} /> Kampaniya tarixi
        </h2>
        {campaigns.length === 0 ? (
          <p className="text-xs text-text-muted">Hozircha kampaniya yo‘q.</p>
        ) : (
          <div className="divide-y divide-border">
            {campaigns.slice(0, 10).map((campaign) => (
              <div
                key={campaign._id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs"
              >
                <span className="font-medium">
                  {campaign.name} · {campaign.segment}
                </span>
                <span className="text-text-muted">
                  {campaign.status === 'TESTED' ? 'Sinov' : campaign.status} ·{' '}
                  {campaign.sentCount || 0}/{campaign.recipientCount || 0}
                </span>
                <time className="text-text-muted">
                  {new Date(campaign.createdAt).toLocaleString('uz-UZ')}
                </time>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
