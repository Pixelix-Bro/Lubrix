import {
  AlertCircle,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Droplet,
  Filter,
  Gauge,
  Loader2,
  Plus,
  Search,
  User,
  Wrench,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { lubrixApi } from '../services/api';
import { lubrixSocket } from '../services/socket';

export default function Services() {
  const theme = useSelector((state) => state.themes.theme);
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState(urlSearch);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [odometerKm, setOdometerKm] = useState('');
  const [oilBrand, setOilBrand] = useState('Castrol');
  const [oilType, setOilType] = useState('Synthetic');
  const [viscosity, setViscosity] = useState('5W-30');
  const [oilQuantity, setOilQuantity] = useState('4');
  const [price, setPrice] = useState('450000');
  const [intervalDays, setIntervalDays] = useState('90');
  const [intervalKm, setIntervalKm] = useState('7000');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [srvRes, custRes, vehRes] = await Promise.all([
        lubrixApi.getServices(),
        lubrixApi.getCustomers(),
        lubrixApi.getVehicles(),
      ]);

      setServices(srvRes.data?.data || []);
      setCustomers(custRes.data?.data || []);
      setVehicles(vehRes.data?.data || []);
    } catch (err) {
      console.error('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsub = lubrixSocket.subscribe('service:created', (newSrv) => {
      setServices((prev) => [newSrv, ...prev]);
    });
    return () => unsub();
  }, []);

  // Filter vehicles when customer changes
  const customerVehicles = vehicles.filter(
    (v) =>
      (typeof v.customerId === 'object' ? v.customerId?._id : v.customerId) === customerId ||
      v.customerId === customerId
  );

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!customerId || !vehicleId || !odometerKm) {
      setError('Mijoz, avtomobil va probeg kiritilishi shart!');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await lubrixApi.createService({
        customerId,
        vehicleId,
        odometerKm: Number(odometerKm),
        oilBrand,
        oilType,
        viscosity,
        oilQuantity: Number(oilQuantity),
        price: Number(price),
        intervalDays: Number(intervalDays),
        intervalKm: Number(intervalKm),
        notes,
      });

      setIsModalOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerId('');
    setVehicleId('');
    setOdometerKm('');
    setOilBrand('Castrol');
    setOilType('Synthetic');
    setViscosity('5W-30');
    setOilQuantity('4');
    setPrice('450000');
    setIntervalDays('90');
    setIntervalKm('7000');
    setNotes('');
    setError('');
  };

  const filteredServices = services.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      (s.plate && s.plate.toLowerCase().includes(q)) ||
      (s.vehicle && s.vehicle.toLowerCase().includes(q)) ||
      (s.oilBrand && s.oilBrand.toLowerCase().includes(q)) ||
      (s.viscosity && s.viscosity.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide flex items-center gap-2.5">
            <Wrench className="text-primary" size={24} />
            <span>Moy Almashtirish Xizmatlari</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Barcha xizmat yozuvlari, keyingi muddatni hisoblash va avtomatik SMS rejalashtirish
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-medium text-sm transition shadow-lg shadow-blue-500/20 shrink-0"
        >
          <Plus size={18} />
          <span>Yangi Xizmat Yozuvi</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
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
            placeholder="Mijoz ismi, avtomobil raqami yoki moy markasi bo‘yicha qidirish..."
            className="w-full bg-transparent outline-none text-sm placeholder:text-gray-500"
          />
        </div>

        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
            theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
          }`}
        >
          <span className="text-xs sm:text-sm text-gray-400">Jami Xizmatlar:</span>
          <span className="font-[title] font-bold text-lg text-primary">
            {services.length} ta
          </span>
        </div>
      </div>

      {/* Services Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 size={32} className="animate-spin text-primary mb-3" />
            <p className="text-sm">Xizmatlar yuklanmoqda...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Wrench size={44} className="text-gray-500 mb-3" />
            <p className="text-base font-semibold">Hech qanday xizmat topilmadi</p>
            <p className="text-xs text-gray-500 mt-1">
              Yangi moy almashtirish xizmatini ro‘yxatga oling
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
                  <th className="px-5 py-4">Sana & Vaqt</th>
                  <th className="px-5 py-4">Mijoz & Avtomobil</th>
                  <th className="px-5 py-4">Moy Tafsilotlari</th>
                  <th className="px-5 py-4">Joriy Probeg</th>
                  <th className="px-5 py-4">Keyingi Servis</th>
                  <th className="px-5 py-4">Holat</th>
                  <th className="px-5 py-4 text-right">Summa (UZS)</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  theme ? 'divide-white/5 text-gray-200' : 'divide-gray-100 text-gray-800'
                }`}
              >
                {filteredServices.map((s) => (
                  <tr
                    key={s._id || s.id}
                    className={`transition ${
                      theme ? 'hover:bg-white/5' : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {new Date(s.serviceDate || s.createdAt).toLocaleDateString('uz-UZ')}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-sm">{s.customerName || 'Mijoz'}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-primary font-mono font-bold text-xs">
                          {s.plate || '—'}
                        </span>
                        <span className="text-xs text-gray-400">{s.vehicle || ''}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-xs sm:text-sm">
                        {s.oilBrand} · <span className="font-mono text-amber-400">{s.viscosity}</span>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {s.oilType} ({s.oilQuantity || 4} Litr)
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5">
                        <Gauge size={13} className="text-amber-500" />
                        <span>{(s.odometerKm || 0).toLocaleString()} km</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-xs font-semibold text-emerald-400">
                        {s.nextDueDate ? new Date(s.nextDueDate).toLocaleDateString('uz-UZ') : '—'}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono">
                        {s.nextDueKm ? `${s.nextDueKm.toLocaleString()} km` : ''}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={12} />
                        <span>Tugallandi</span>
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right font-mono font-bold text-emerald-400">
                      {(Number(s.price) || 0).toLocaleString()} UZS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div
            className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl relative my-8 transition-all ${
              theme ? 'border-white/10 bg-surface text-white' : 'border-gray-200 bg-white text-gray-900'
            }`}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-200 p-1"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold font-[title] mb-1 flex items-center gap-2">
              <Wrench className="text-primary" size={20} />
              <span>Yangi Xizmat Yozuvi</span>
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Avtomobilga moy quyish ma'lumotlarini kiriting. Keyingi servis muddati avtomatik hisoblanadi.
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateService} className="space-y-4">
              {/* Customer & Vehicle Select */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Mijoz *
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => {
                      setCustomerId(e.target.value);
                      setVehicleId('');
                    }}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  >
                    <option value="" disabled className="text-gray-500">
                      Mijozni tanlang...
                    </option>
                    {customers.map((c) => (
                      <option
                        key={c._id || c.id}
                        value={c._id || c.id}
                        className={theme ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}
                      >
                        {c.fullName} ({c.phoneE164 || c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Avtomobil *
                  </label>
                  <select
                    value={vehicleId}
                    onChange={(e) => {
                      setVehicleId(e.target.value);
                      const selVeh = vehicles.find((v) => (v._id || v.id) === e.target.value);
                      if (selVeh?.currentOdometerKm) {
                        setOdometerKm(selVeh.currentOdometerKm);
                      }
                    }}
                    required
                    disabled={!customerId}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition disabled:opacity-50 ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  >
                    <option value="" disabled className="text-gray-500">
                      {customerId ? 'Avtomobilni tanlang...' : 'Avval mijozni tanlang'}
                    </option>
                    {customerVehicles.map((v) => (
                      <option
                        key={v._id || v.id}
                        value={v._id || v.id}
                        className={theme ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}
                      >
                        {v.plateNumber} — {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Odometer & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Joriy Probeg (km) *
                  </label>
                  <input
                    type="number"
                    value={odometerKm}
                    onChange={(e) => setOdometerKm(e.target.value)}
                    placeholder="85000"
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
                    Xizmat Narxi (UZS) *
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="450000"
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              {/* Oil Specs */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Moy Markasi *
                  </label>
                  <input
                    value={oilBrand}
                    onChange={(e) => setOilBrand(e.target.value)}
                    placeholder="Castrol, Shell, Mobil..."
                    required
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Viskozitet *
                  </label>
                  <select
                    value={viscosity}
                    onChange={(e) => setViscosity(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  >
                    <option value="5W-30">5W-30</option>
                    <option value="5W-40">5W-40</option>
                    <option value="0W-20">0W-20</option>
                    <option value="10W-40">10W-40</option>
                    <option value="15W-40">15W-40</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Hajmi (Litr) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={oilQuantity}
                    onChange={(e) => setOilQuantity(e.target.value)}
                    placeholder="4"
                    required
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              {/* Intervals */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Keyingi Interval (kun)
                  </label>
                  <input
                    type="number"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(e.target.value)}
                    placeholder="90"
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Keyingi Interval (km)
                  </label>
                  <input
                    type="number"
                    value={intervalKm}
                    onChange={(e) => setIntervalKm(e.target.value)}
                    placeholder="7000"
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                  Qo‘shimcha Izoh (ixtiyoriy)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Moy filtri va havo filtri ham almashtirildi..."
                  rows={2}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none transition ${
                    theme
                      ? 'border-white/10 bg-white/5 text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-900'
                  }`}
                />
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
                    <span>Xizmatni Saqlash</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
