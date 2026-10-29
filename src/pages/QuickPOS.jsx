import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Minus,
  Plus,
  Printer,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  User,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import MoneyInput from '../components/ui/MoneyInput'
import VoiceField from '../components/ui/VoiceField'
import { lubrixApi } from '../services/api'
import { formatMoney } from '../utils/formatNumber'

function qrSvg(payload) {
  const encoded = encodeURIComponent(payload)
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}`
}

export default function QuickPOS() {
  const theme = useSelector((state) => state.themes.theme)
  const org = useSelector((state) => state.auth?.user)

  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)

  const [cart, setCart] = useState([])
  const [guestMode, setGuestMode] = useState(true)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestPlate, setGuestPlate] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [odometerKm, setOdometerKm] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [productCategory, setProductCategory] = useState('ALL')
  const [productSearch, setProductSearch] = useState('')
  const [checkoutComplete, setCheckoutComplete] = useState(false)
  const [pendingPay, setPendingPay] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastReceipt, setLastReceipt] = useState(null)
  const [cardLastFour, setCardLastFour] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const [prodRes, custRes, vehRes, cardRes] = await Promise.all([
        lubrixApi.getProducts(),
        lubrixApi.getCustomers(),
        lubrixApi.getVehicles(),
        lubrixApi.getPaymentCards().catch(() => ({ data: { data: [] } })),
      ])
      setProducts(prodRes.data?.data || [])
      setCustomers(custRes.data?.data || [])
      setVehicles(vehRes.data?.data || [])
      setCards(cardRes.data?.data || [])
    } catch (err) {
      console.error('POS load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const addToCart = (product, customQty = 1) => {
    setCart((prev) => {
      const id = product._id || product.id
      const existing = prev.find((item) => (item._id || item.id) === id)
      if (existing) {
        return prev.map((item) =>
          (item._id || item.id) === id ? { ...item, qty: Number((item.qty + customQty).toFixed(1)) } : item
        )
      }
      return [...prev, { ...product, qty: customQty, price: Number(product.price) || 0 }]
    })
  }

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if ((item._id || item.id) === id) {
            const next = Number((item.qty + delta).toFixed(1))
            return next > 0 ? { ...item, qty: next } : null
          }
          return item
        })
        .filter(Boolean)
    )
  }

  const removeFromCart = (id) => setCart((prev) => prev.filter((item) => (item._id || item.id) !== id))

  const totalAmount = cart.reduce((acc, item) => acc + item.qty * item.price, 0)

  const customerVehicles = useMemo(() => {
    if (!selectedCustomer) return []
    const cid = selectedCustomer._id || selectedCustomer.id
    return vehicles.filter((v) => String(v.customerId) === String(cid))
  }, [vehicles, selectedCustomer])

  const filteredProducts = products.filter((p) => {
    const q = productSearch.trim().toLowerCase()
    const matchQ =
      !q ||
      [p.name, p.brand, p.viscosity, p.barcode].some((f) => String(f || '').toLowerCase().includes(q))
    const matchCat =
      productCategory === 'ALL' ||
      p.oilType === productCategory ||
      p.category === productCategory
    return matchQ && matchCat
  })

  const payloadBase = () => {
    const mainOil = cart.find((i) => i.viscosity) || cart[0]
    const isGuest = guestMode
    return {
      amount: totalAmount,
      provider: paymentMethod,
      customerId: isGuest ? null : selectedCustomer?._id || selectedCustomer?.id,
      customerName: isGuest
        ? guestName.trim() || 'Bir martalik mijoz'
        : selectedCustomer?.fullName || 'Mijoz',
      customerPhone: isGuest ? guestPhone : selectedCustomer?.phoneE164 || selectedCustomer?.phone,
      vehiclePlate: isGuest ? guestPlate : selectedVehicle?.plateNumber || '',
      items: cart.map((item) => ({
        productId: item._id || item.id,
        name: item.name,
        quantity: item.qty,
        unitPrice: item.price,
        total: item.qty * item.price,
      })),
      serviceDetails: {
        odometerKm: Number(String(odometerKm).replace(/\s/g, '')) || 0,
        oilBrand: mainOil?.brand || '',
        oilType: mainOil?.oilType || '',
        viscosity: mainOil?.viscosity || '',
        liters: mainOil?.qty || 0,
      },
    }
  }

  const handleCheckout = async () => {
    if (!cart.length) return
    if (!guestMode && !selectedCustomer) {
      toast.error('Mijozni tanlang yoki bir martalik rejimni yoqing')
      return
    }
    if (paymentMethod !== 'CASH' && cards.length === 0 && ['UZCARD', 'HUMO'].includes(paymentMethod)) {
      toast.error('Avval sozlamalarda qabul qiluvchi kartani ulang')
      return
    }
    try {
      setIsSubmitting(true)
      const res = await lubrixApi.posCharge(payloadBase())
      if (res.data?.pending) {
        setPendingPay(res.data.data)
        return
      }
      if (res.data?.success) {
        setLastReceipt(res.data.data)
        setCheckoutComplete(true)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'To‘lovda xatolik yuz berdi')
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmCard = async () => {
    if (!pendingPay?.transaction?._id) return
    try {
      setIsSubmitting(true)
      const res = await lubrixApi.confirmPosPayment({
        transactionId: pendingPay.transaction._id,
        cardLastFour: cardLastFour || undefined,
      })
      if (res.data?.success) {
        setLastReceipt(res.data.data)
        setPendingPay(null)
        setCheckoutComplete(true)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Tasdiqlashda xatolik')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetOrder = () => {
    setCart([])
    setLastReceipt(null)
    setCheckoutComplete(false)
    setPendingPay(null)
    setCardLastFour('')
  }

  const receipt = lastReceipt?.transaction || lastReceipt
  const receiptNo = lastReceipt?.receiptNumber || receipt?.receiptNumber
  const invoiceNo = lastReceipt?.invoice?.invoiceNumber

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Zap className="text-primary" size={22} />
            <span>Kassa</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Doimiy va bir martalik mijozlar uchun to‘lov va chek
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'}`}>
            <VoiceField
              value={productSearch}
              onChange={setProductSearch}
              placeholder="Mahsulot nomi, brend yoki shtrix-kod..."
              className="w-full"
              inputClassName="text-sm py-1"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {['ALL', 'Synthetic', 'Semi-Synthetic', 'Filter'].map((cat) => (
              <button
                key={cat}
                onClick={() => setProductCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  productCategory === cat
                    ? 'bg-primary text-white shadow-sm'
                    : 'border border-inherit text-gray-400 hover:text-white'
                }`}
              >
                {cat === 'ALL' ? 'Barchasi' : cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Yuklanmoqda...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400 border border-dashed rounded-2xl">
              Mahsulot yo‘q. Omborga qo‘shilgandan so‘ng shu yerda chiqadi.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((p) => (
                <button
                  type="button"
                  key={p._id || p.id}
                  onClick={() => addToCart(p, 1)}
                  className={`p-4 rounded-2xl border text-left transition hover:border-primary ${
                    theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {p.brand}
                    </span>
                    {p.viscosity && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold">
                        {p.viscosity}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold line-clamp-1">{p.name}</h3>
                  <div className="mt-3 pt-2 border-t border-inherit font-mono font-bold text-xs text-emerald-400">
                    {formatMoney(p.price)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <div
            className={`p-6 rounded-3xl border ${
              theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
            }`}
          >
            {checkoutComplete ? (
              <div className="space-y-4 print:text-black" id="pos-receipt">
                <div className="text-center space-y-1 border-b border-dashed pb-4">
                  <p className="text-sm font-bold">{org?.organizationName || org?.name || 'Servis'}</p>
                  <p className="text-[11px] text-gray-400">Sotuv cheki</p>
                  <p className="font-mono text-xs">{receiptNo}</p>
                  {invoiceNo && <p className="font-mono text-[11px] text-gray-400">{invoiceNo}</p>}
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mijoz</span>
                    <span>{payloadBase().customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Davlat raqami</span>
                    <span className="font-mono">{payloadBase().vehiclePlate || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Usul</span>
                    <span>{paymentMethod}</span>
                  </div>
                </div>
                <div className="space-y-1 text-xs border-y border-dashed py-3">
                  {cart.map((item) => (
                    <div key={item._id || item.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {item.name} x {item.qty}
                      </span>
                      <span className="font-mono">{formatMoney(item.qty * item.price)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold">
                  <span>Jami</span>
                  <span className="font-mono">{formatMoney(totalAmount)}</span>
                </div>
                {receiptNo && (
                  <div className="flex justify-center pt-2">
                    <img src={qrSvg(`CHEK:${receiptNo}`)} alt="Chek QR" className="w-28 h-28 bg-white rounded" />
                  </div>
                )}
                <div className="flex items-center justify-center gap-3 pt-2 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold border-white/10 hover:bg-white/5"
                  >
                    <Printer size={15} />
                    Chop etish
                  </button>
                  <button
                    onClick={resetOrder}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold"
                  >
                    Yangi savdo
                  </button>
                </div>
              </div>
            ) : pendingPay ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-400">
                  <Lock size={16} />
                  <h3 className="text-sm font-bold">Karta / QR to‘lovi kutilmoqda</h3>
                </div>
                <p className="text-xs text-gray-400">
                  To‘lov hali tasdiqlanmagan. Mijoz kartadan yoki QR orqali to‘lagach, tasdiqlang. Chek faqat shundan keyin chiqadi.
                </p>
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs space-y-1">
                  <p className="flex items-center gap-1.5">
                    <ShieldCheck size={13} /> Terminal yoki tizimga ulangan karta orqali yechiladi
                  </p>
                  <p>Summa: {formatMoney(totalAmount)}</p>
                  <p>Tranzaksiya: {pendingPay.transaction?.merchantTransactionId}</p>
                  {cards[0] && <p>Qabul qiluvchi: {cards[0].cardNumberMasked} ({cards[0].cardType})</p>}
                </div>
                <div className="flex justify-center">
                  <img
                    src={qrSvg(pendingPay.qrPayload || pendingPay.paymentUrl || `pay:${pendingPay.transaction?._id}`)}
                    alt="To‘lov QR"
                    className="w-40 h-40 bg-white rounded-xl p-2"
                  />
                </div>
                <input
                  value={cardLastFour}
                  onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Karta oxirgi 4 raqami (ixtiyoriy)"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200'}`}
                />
                <button
                  onClick={confirmCard}
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Tasdiqlanmoqda...' : 'To‘lov keldi, chek chiqarish'}
                </button>
                <button onClick={() => setPendingPay(null)} className="w-full text-xs text-gray-400">
                  Ortga
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-inherit mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <ShoppingBag size={15} /> Chek
                  </span>
                  <button onClick={resetOrder} className="text-[11px] text-red-400">
                    Tozalash
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setGuestMode(true)}
                    className={`py-2 rounded-xl text-xs font-semibold border ${
                      guestMode ? 'border-primary bg-primary/10 text-primary' : 'border-inherit text-gray-400'
                    }`}
                  >
                    Bir martalik
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestMode(false)}
                    className={`py-2 rounded-xl text-xs font-semibold border ${
                      !guestMode ? 'border-primary bg-primary/10 text-primary' : 'border-inherit text-gray-400'
                    }`}
                  >
                    Doimiy mijoz
                  </button>
                </div>

                {guestMode ? (
                  <div className="space-y-2 mb-4">
                    <input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Ism (ixtiyoriy)"
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200'}`}
                    />
                    <input
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="Telefon (ixtiyoriy)"
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200'}`}
                    />
                    <input
                      value={guestPlate}
                      onChange={(e) => setGuestPlate(e.target.value.toUpperCase())}
                      placeholder="Davlat raqami"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200'}`}
                    />
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    <select
                      value={selectedCustomer?._id || selectedCustomer?.id || ''}
                      onChange={(e) => {
                        const found = customers.find((c) => String(c._id || c.id) === e.target.value)
                        setSelectedCustomer(found || null)
                        setSelectedVehicle(null)
                      }}
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200'}`}
                    >
                      <option value="">Mijozni tanlang</option>
                      {customers.map((c) => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.fullName} {c.phoneE164 ? `(${c.phoneE164})` : ''}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedVehicle?._id || selectedVehicle?.id || ''}
                      onChange={(e) => {
                        const found = customerVehicles.find((v) => String(v._id || v.id) === e.target.value)
                        setSelectedVehicle(found || null)
                      }}
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200'}`}
                    >
                      <option value="">Avtomobil</option>
                      {customerVehicles.map((v) => (
                        <option key={v._id || v.id} value={v._id || v.id}>
                          {v.plateNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <MoneyInput
                  value={odometerKm}
                  onChange={setOdometerKm}
                  placeholder="Probeg, km"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono mb-4 ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200'}`}
                />

                <div className="space-y-2 max-h-44 overflow-y-auto mb-4">
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">Savatcha bo‘sh</div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item._id || item.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          theme ? 'border-white/5 bg-white/5' : 'border-gray-100'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{item.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {item.qty} x {formatMoney(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => updateQty(item._id || item.id, -1)} className="p-1 rounded bg-white/10">
                            <Minus size={12} />
                          </button>
                          <span className="font-mono">{item.qty}</span>
                          <button type="button" onClick={() => updateQty(item._id || item.id, 1)} className="p-1 rounded bg-white/10">
                            <Plus size={12} />
                          </button>
                          <button type="button" onClick={() => removeFromCart(item._id || item.id)} className="p-1 text-red-400">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { id: 'CASH', label: 'Naqd', icon: Banknote },
                    { id: 'UZCARD', label: 'Uzcard', icon: CreditCard },
                    { id: 'HUMO', label: 'Humo', icon: CreditCard },
                    { id: 'CLICK', label: 'QR', icon: QrCode },
                  ].map((method) => {
                    const Icon = method.icon
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`flex flex-col items-center p-2 rounded-xl border text-[11px] ${
                          paymentMethod === method.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-inherit text-gray-400'
                        }`}
                      >
                        <Icon size={14} />
                        <span className="mt-1">{method.label}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between font-bold mb-3">
                  <span>Jami</span>
                  <span className="font-mono text-emerald-400">{formatMoney(totalAmount)}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={!cart.length || isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  {paymentMethod === 'CASH' ? 'Naqd qabul qilish' : 'Kartaga / QR ga o‘tkazish'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
