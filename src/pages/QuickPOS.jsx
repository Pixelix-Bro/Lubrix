import {
  Banknote,
  Barcode,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Droplet,
  Gauge,
  Loader2,
  Minus,
  Plus,
  Printer,
  QrCode,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  User,
  Wrench,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { lubrixApi } from '../services/api';

export default function QuickPOS() {
  const theme = useSelector((state) => state.themes.theme);

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cart / Bill State
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [odometerKm, setOdometerKm] = useState('75000');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' | 'UZCARD' | 'HUMO' | 'CLICK'
  const [customerSearch, setCustomerSearch] = useState('');
  const [productCategory, setProductCategory] = useState('ALL');
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

  // Popular Quick-Cars presets in Uzbekistan
  const popularCars = [
    { name: 'Cobalt 1.5', oilCapacity: 3.75, viscosity: '5W-30' },
    { name: 'Gentra 1.5', oilCapacity: 3.75, viscosity: '5W-30' },
    { name: 'Tracker 1.2T', oilCapacity: 4.0, viscosity: '0W-20' },
    { name: 'Malibu 2.0T', oilCapacity: 4.7, viscosity: '5W-30' },
    { name: 'Kia K5 2.0', oilCapacity: 4.3, viscosity: '5W-20' },
    { name: 'BYD Song Plus', oilCapacity: 3.5, viscosity: '0W-20' },
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, custRes, vehRes] = await Promise.all([
        lubrixApi.getProducts(),
        lubrixApi.getCustomers(),
        lubrixApi.getVehicles(),
      ]);
      setProducts(prodRes.data?.data || []);
      setCustomers(custRes.data?.data || []);
      setVehicles(vehRes.data?.data || []);

      if (custRes.data?.data?.length > 0) {
        setSelectedCustomer(custRes.data.data[0]);
      }
      if (vehRes.data?.data?.length > 0) {
        setSelectedVehicle(vehRes.data.data[0]);
      }
    } catch (err) {
      console.error('POS load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Add Product to Cart
  const addToCart = (product, customQty = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => (item._id || item.id) === (product._id || product.id));
      if (existing) {
        return prev.map((item) =>
          (item._id || item.id) === (product._id || product.id)
            ? { ...item, qty: Number((item.qty + customQty).toFixed(1)) }
            : item
        );
      }
      return [
        ...prev,
        {
          ...product,
          qty: customQty,
          price: product.price || 120000,
        },
      ];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if ((item._id || item.id) === id) {
            const next = Number((item.qty + delta).toFixed(1));
            return next > 0 ? { ...item, qty: next } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => (item._id || item.id) !== id));
  };

  const totalAmount = cart.reduce((acc, item) => acc + item.qty * item.price, 0);

  // Complete Express POS Checkout with Real Payment & Invoice
  const handleCheckout = async () => {
    if (!cart.length) return;
    try {
      setIsSubmitting(true);
      const mainOil = cart.find((i) => i.viscosity) || cart[0];

      const res = await lubrixApi.posCharge({
        amount: totalAmount,
        provider: paymentMethod, // CASH, UZCARD, HUMO, CLICK, TERMINAL
        customerId: selectedCustomer?._id || selectedCustomer?.id,
        customerName: selectedCustomer?.fullName || 'Mijoz',
        customerPhone: selectedCustomer?.phoneE164 || selectedCustomer?.phone,
        vehiclePlate: selectedVehicle?.plateNumber || '01 777 AAA',
        items: cart.map((item) => ({
          productId: item._id || item.id,
          name: item.name,
          quantity: item.qty,
          unitPrice: item.price,
          total: item.qty * item.price,
        })),
        serviceDetails: {
          odometerKm: Number(odometerKm) || 75000,
          oilBrand: mainOil?.brand || 'Lubrix Oil',
          oilType: mainOil?.oilType || 'Synthetic',
          viscosity: mainOil?.viscosity || '5W-30',
          liters: mainOil?.qty || 4,
        },
      });

      if (res.data?.success) {
        setLastReceipt(res.data.data);
        setCheckoutComplete(true);
      }
    } catch (err) {
      console.error('POS Checkout failed:', err);
      toast.error(err.response?.data?.error || err.message || 'To‘lovda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetOrder = () => {
    setCart([]);
    setLastReceipt(null);
    setCheckoutComplete(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Zap className="text-primary" size={22} />
            <span>Kassa & POS Terminali</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Moy almashtirish xizmatlari va mahsulot sotuvini tezkor rasmiylashtirish
          </p>
        </div>

        {/* Quick Popular Car Selectors */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {popularCars.map((car) => (
            <button
              key={car.name}
              onClick={() => {
                // Find matching oil in inventory or add placeholder
                const matching = products.find((p) => p.viscosity === car.viscosity) || {
                  name: `Motor Moyi ${car.viscosity}`,
                  brand: 'Castrol',
                  viscosity: car.viscosity,
                  price: 110000,
                };
                addToCart(matching, car.oilCapacity);
              }}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-primary hover:text-white text-[11px] font-semibold whitespace-nowrap transition"
            >
              + {car.name} ({car.oilCapacity}L)
            </button>
          ))}
        </div>
      </div>

      {/* POS Grid: Catalog on Left, Bill on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Products & Fast Buttons */}
        <div className="lg:col-span-7 space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {['ALL', 'Synthetic', 'Semi-Synthetic', 'Filters'].map((cat) => (
              <button
                key={cat}
                onClick={() => setProductCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  productCategory === cat
                    ? 'bg-primary text-white shadow-sm'
                    : 'border border-inherit text-gray-400 hover:text-white'
                }`}
              >
                {cat === 'ALL' ? 'Barcha Mahsulotlar' : cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p) => (
              <div
                key={p._id || p.id}
                onClick={() => addToCart(p, 4)}
                className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between hover:scale-[1.02] hover:border-primary active:scale-[0.98] ${
                  theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-[title]">
                      {p.brand}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold">
                      {p.viscosity || '5W-30'}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold line-clamp-1">{p.name}</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">{p.oilType || 'Sintetika'}</p>
                </div>

                <div className="mt-4 pt-2 border-t border-inherit flex items-center justify-between">
                  <span className="font-mono font-bold text-xs sm:text-sm text-emerald-400">
                    {(p.price || 120000).toLocaleString()} UZS/L
                  </span>
                  <span className="p-1 rounded-lg bg-primary text-white">
                    <Plus size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Ticket & Checkout Summary */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className={`p-6 rounded-3xl border flex flex-col justify-between ${
              theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
            }`}
          >
            {checkoutComplete ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-lg font-bold font-[title]">TO‘LOV VA XIZMAT YAKUNLANDI!</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Mablag‘ kassaga kirim qilindi, ombor qoldig‘i kamaytirildi va tranzaksiya qayd etildi.
                </p>

                {/* Printable Receipt Card */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs font-mono space-y-2">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">Chek raqami:</span>
                    <span className="font-bold text-primary">{lastReceipt?.receiptNumber || 'RCP-998877'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">Faktura raqami:</span>
                    <span className="font-bold text-gray-200">{lastReceipt?.invoice?.invoiceNumber || 'INV-1002'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">Mijoz / Avto:</span>
                    <span className="font-bold text-gray-200">
                      {selectedCustomer?.fullName || 'Mijoz'} ({selectedVehicle?.plateNumber || 'Avto'})
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">To‘lov usuli:</span>
                    <span className="font-bold text-amber-400">{paymentMethod}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm font-bold">
                    <span>JAMI TO‘LANGAN:</span>
                    <span className="text-emerald-400">{totalAmount.toLocaleString()} UZS</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold border-white/10 hover:bg-white/5 cursor-pointer"
                  >
                    <Printer size={15} />
                    <span>Chekni Chop Etish</span>
                  </button>
                  <button
                    onClick={resetOrder}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    <span>Yangi Buyurtma</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-inherit mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider font-[title] text-primary flex items-center gap-2">
                      <ShoppingBag size={15} />
                      <span>Buyurtma Cheki</span>
                    </span>
                    <button
                      onClick={resetOrder}
                      className="text-[11px] text-red-400 hover:underline"
                    >
                      Tozalash
                    </button>
                  </div>

                  {/* Customer and Vehicle Pickers */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1 font-[title]">
                        Mijoz:
                      </label>
                      <select
                        value={selectedCustomer?._id || selectedCustomer?.id || ''}
                        onChange={(e) => {
                          const found = customers.find(
                            (c) => (c._id || c.id) === e.target.value
                          );
                          setSelectedCustomer(found);
                        }}
                        className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                          theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        {customers.map((c) => (
                          <option
                            key={c._id || c.id}
                            value={c._id || c.id}
                            className="bg-slate-900 text-white"
                          >
                            {c.fullName} ({c.phoneE164 || c.phone})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1 font-[title]">
                          Avtomobil:
                        </label>
                        <select
                          value={selectedVehicle?._id || selectedVehicle?.id || ''}
                          onChange={(e) => {
                            const found = vehicles.find(
                              (v) => (v._id || v.id) === e.target.value
                            );
                            setSelectedVehicle(found);
                          }}
                          className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                            theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          {vehicles.map((v) => (
                            <option
                              key={v._id || v.id}
                              value={v._id || v.id}
                              className="bg-slate-900 text-white"
                            >
                              {v.plateNumber} ({v.make})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1 font-[title]">
                          Joriy Probeg (km):
                        </label>
                        <input
                          type="number"
                          value={odometerKm}
                          onChange={(e) => setOdometerKm(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                            theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cart Items List */}
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {cart.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400">
                        Tanlangan mahsulotlar yo‘q. Chapdan bosing.
                      </div>
                    ) : (
                      cart.map((item) => (
                        <div
                          key={item._id || item.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                            theme ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate">{item.name}</p>
                            <p className="text-[10px] text-gray-400">
                              {item.qty}L × {item.price?.toLocaleString()} UZS
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQty(item._id || item.id, -0.5)}
                              className="p-1 rounded bg-white/10 hover:bg-white/20"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="font-mono font-bold text-xs">{item.qty}L</span>
                            <button
                              onClick={() => updateQty(item._id || item.id, 0.5)}
                              className="p-1 rounded bg-white/10 hover:bg-white/20"
                            >
                              <Plus size={12} />
                            </button>
                            <button
                              onClick={() => removeFromCart(item._id || item.id)}
                              className="p-1 rounded text-red-400 hover:bg-red-500/10 ml-1"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Payment Methods and Total Amount */}
                <div className="pt-4 border-t border-inherit mt-4 space-y-4">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-2 font-[title]">
                      To‘lov Usuli:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'CASH', label: 'Naqd', icon: <Banknote size={14} /> },
                        { id: 'UZCARD', label: 'UzCard', icon: <CreditCard size={14} /> },
                        { id: 'HUMO', label: 'Humo', icon: <CreditCard size={14} /> },
                        { id: 'CLICK', label: 'Click', icon: <QrCode size={14} /> },
                      ].map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-semibold transition ${
                            paymentMethod === method.id
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-inherit text-gray-400 hover:text-white'
                          }`}
                        >
                          {method.icon}
                          <span className="mt-1">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Total and Checkout Button */}
                  <div className="flex items-center justify-between text-base font-bold font-[title]">
                    <span>JAMI TO‘LOV:</span>
                    <span className="text-xl text-emerald-400 font-mono">
                      {totalAmount.toLocaleString()} UZS
                    </span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={!cart.length || isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-[title] font-bold text-sm tracking-wider transition shadow-xl shadow-emerald-600/25 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Rasmiylashtirilmoqda...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>XIZMATNI YOPISH & CHEK</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
