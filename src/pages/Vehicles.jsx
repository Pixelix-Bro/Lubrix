import {
  AlertCircle,
  Calendar,
  Car,
  ChevronRight,
  Gauge,
  History,
  Loader2,
  Plus,
  Search,
  User,
  Wrench,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { lubrixApi } from '../services/api';
import { lubrixSocket } from '../services/socket';

export default function Vehicles() {
  const theme = useSelector((state) => state.themes.theme);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [vin, setVin] = useState('');
  const [currentOdometerKm, setCurrentOdometerKm] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [vehRes, custRes] = await Promise.all([
        lubrixApi.getVehicles({ search }),
        lubrixApi.getCustomers(),
      ]);
      setVehicles(vehRes.data.data || []);
      setCustomers(custRes.data.data || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsub = lubrixSocket.subscribe('vehicle:created', (newVeh) => {
      setVehicles((prev) => [newVeh, ...prev]);
    });
    return () => unsub();
  }, [search]);

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    if (!customerId || !plateNumber) {
      setError('Mijoz va davlat raqamini kiritish shart!');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await lubrixApi.createVehicle({
        customerId,
        plateNumber,
        make,
        model,
        modelYear: modelYear ? Number(modelYear) : undefined,
        vin,
        currentOdometerKm: currentOdometerKm ? Number(currentOdometerKm) : 0,
      });

      setIsModalOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerId('');
    setPlateNumber('');
    setMake('');
    setModel('');
    setModelYear('');
    setVin('');
    setCurrentOdometerKm('');
    setError('');
  };

  // Helper to find customer name
  const getCustomerName = (cust) => {
    if (typeof cust === 'object' && cust?.fullName) return cust.fullName;
    const found = customers.find((c) => c._id === cust || c.id === cust);
    return found ? found.fullName : 'Biriktirilmagan';
  };

  const filteredVehicles = vehicles.filter((v) => {
    const q = search.toLowerCase();
    return (
      (v.plateNumber && v.plateNumber.toLowerCase().includes(q)) ||
      (v.make && v.make.toLowerCase().includes(q)) ||
      (v.model && v.model.toLowerCase().includes(q)) ||
      (v.vin && v.vin.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide flex items-center gap-2.5">
            <Car className="text-primary" size={24} />
            <span>Avtomobillar Boshqaruvi</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Servisga kelgan barcha avtomobillar, ularning egalari va probeg tarixi
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
          <span>Yangi Avtomobil</span>
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
            placeholder="Davlat raqami, marka, model yoki VIN kodi bo‘yicha qidirish..."
            className="w-full bg-transparent outline-none text-sm placeholder:text-gray-500"
          />
        </div>

        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
            theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
          }`}
        >
          <span className="text-xs sm:text-sm text-gray-400">Jami Avtomobillar:</span>
          <span className="font-[title] font-bold text-lg text-primary">
            {vehicles.length} ta
          </span>
        </div>
      </div>

      {/* Vehicles Table / Grid */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 size={32} className="animate-spin text-primary mb-3" />
            <p className="text-sm">Avtomobillar yuklanmoqda...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Car size={44} className="text-gray-500 mb-3" />
            <p className="text-base font-semibold">Hech qanday avtomobil topilmadi</p>
            <p className="text-xs text-gray-500 mt-1">
              {search ? 'Qidiruv shartini o‘zgartirib ko‘ring' : 'Birinchi avtomobilni qo‘shing'}
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
                  <th className="px-5 py-4">Davlat Raqami</th>
                  <th className="px-5 py-4">Marka & Model</th>
                  <th className="px-5 py-4">Egasi (Mijoz)</th>
                  <th className="px-5 py-4">Joriy Probeg</th>
                  <th className="px-5 py-4">Yili / VIN</th>
                  <th className="px-5 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  theme ? 'divide-white/5 text-gray-200' : 'divide-gray-100 text-gray-800'
                }`}
              >
                {filteredVehicles.map((v) => {
                  const custName = getCustomerName(v.customerId);
                  return (
                    <tr
                      key={v._id || v.id}
                      className={`transition ${
                        theme ? 'hover:bg-white/5' : 'hover:bg-gray-50/80'
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-bold tracking-wider text-xs sm:text-sm">
                          <span className="text-[10px] text-blue-300">UZ</span>
                          <span>{v.plateNumber}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold">{v.make || 'Noma‘lum'} {v.model || ''}</div>
                        {v.modelYear && (
                          <div className="text-xs text-gray-400">{v.modelYear}-yil</div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <User size={14} className="text-gray-400" />
                          <span>{custName}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-mono font-medium">
                          <Gauge size={14} className="text-amber-500" />
                          <span>{(v.currentOdometerKm || 0).toLocaleString()} km</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-gray-400 font-mono">
                        {v.vin || '—'}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/services?search=${encodeURIComponent(v.plateNumber)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition"
                        >
                          <Wrench size={13} />
                          <span>Xizmatlar</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Vehicle */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative transition-all ${
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
              <Car className="text-primary" size={20} />
              <span>Yangi Avtomobil Qo‘shish</span>
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Mijozga biriktirilgan yangi transport vositasini ro‘yxatga oling
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                  Mijoz (Egasi) *
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Davlat Raqami *
                  </label>
                  <input
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    placeholder="01 A 777 AA"
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono uppercase outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Joriy Probeg (km)
                  </label>
                  <input
                    type="number"
                    value={currentOdometerKm}
                    onChange={(e) => setCurrentOdometerKm(e.target.value)}
                    placeholder="75000"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition ${
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
                    Markasi
                  </label>
                  <input
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    placeholder="Chevrolet, Toyota, BMW..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Modeli
                  </label>
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Tracker, Malibu, Camry..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition ${
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
                    Ishlab chiqarilgan yili
                  </label>
                  <input
                    type="number"
                    value={modelYear}
                    onChange={(e) => setModelYear(e.target.value)}
                    placeholder="2023"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    VIN Kodi (ixtiyoriy)
                  </label>
                  <input
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    placeholder="KL7..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono uppercase outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
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
                    <span>Saqlash</span>
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
