import {
  AlertCircle,
  AlertTriangle,
  Battery,
  Calendar,
  Car,
  CheckCircle2,
  CircleGauge,
  ClipboardCheck,
  Disc,
  Droplet,
  Eye,
  FileText,
  Gauge,
  Loader2,
  Printer,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThermometerSnowflake,
  User,
  Wind,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { lubrixApi } from '../services/api';

export default function InspectionChecklist() {
  const theme = useSelector((state) => state.themes.theme);

  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [odometerKm, setOdometerKm] = useState('78000');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // 15-Point Inspection Points
  const [checklist, setChecklist] = useState({
    engineOilLevel: 'REPLACE', // 'OK' | 'REPLACE' | 'CRITICAL'
    engineOilColor: 'DARK', // 'CLEAR' | 'DARK' | 'BURNT'
    oilFilter: 'REPLACE',
    airFilter: 'DIRTY', // 'CLEAN' | 'DIRTY' | 'URGENT'
    cabinFilter: 'DIRTY',
    brakeFluidMoisture: 'OK', // 'OK' | 'WARN' | 'DANGER'
    coolantAntifreeze: 'OK', // 'OK' | 'LOW' | 'REPLACE'
    batteryVoltage: '12.6V - Yaxshi',
    tirePressureFront: '2.2 Bar',
    tirePressureRear: '2.2 Bar',
    tireTread: 'Yaxshi (5mm+)',
    underbodyLeaks: 'NONE', // 'NONE' | 'SWEATING' | 'LEAKING'
    beltCondition: 'OK',
    brakePadsFront: '60% qolgan',
    brakePadsRear: '70% qolgan',
  });

  const [technicianNotes, setTechnicianNotes] = useState(
    'Moy va filtrlar to‘liq almashtirildi. Keyingi tekshiruvda tormoz kolodkalarini almashtirish tavsiya etiladi.'
  );

  useEffect(() => {
    Promise.all([lubrixApi.getCustomers(), lubrixApi.getVehicles()]).then(
      ([cRes, vRes]) => {
        setCustomers(cRes.data?.data || []);
        setVehicles(vRes.data?.data || []);
        if (cRes.data?.data?.length > 0) setSelectedCustomer(cRes.data.data[0]);
        if (vRes.data?.data?.length > 0) setSelectedVehicle(vRes.data.data[0]);
      }
    );
  }, []);

  const handleSaveInspection = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OK':
      case 'CLEAN':
      case 'NONE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} />
            <span>A'lo (Normada)</span>
          </span>
        );
      case 'REPLACE':
      case 'DIRTY':
      case 'WARN':
      case 'SWEATING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle size={12} />
            <span>Almashtirish tavsiya</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle size={12} />
            <span>Kritik holat</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide flex items-center gap-2.5">
            <ClipboardCheck className="text-primary" size={24} />
            <span>Avtomobil 15 Nuqtali Ko‘rik Varaqasi</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Moy almashtirish jarayonida avtomobil xavfsizlik nuqtalarini tekshirish va mijozga rasmiy xulosa berish
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
              ✓ Saqlandi!
            </span>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-inherit text-xs font-semibold hover:bg-white/5"
          >
            <Printer size={15} />
            <span>Chop Etish (PDF)</span>
          </button>
          <button
            onClick={handleSaveInspection}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-blue-600 text-white text-xs font-semibold shadow-lg shadow-blue-500/20"
          >
            <Save size={15} />
            <span>Saqlash</span>
          </button>
        </div>
      </div>

      {/* Customer & Car Info Header */}
      <div
        className={`p-6 rounded-3xl border grid grid-cols-1 sm:grid-cols-3 gap-4 ${
          theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
        }`}
      >
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 font-[title]">
            Mijoz
          </label>
          <select
            value={selectedCustomer?._id || selectedCustomer?.id || ''}
            onChange={(e) => {
              const found = customers.find((c) => (c._id || c.id) === e.target.value);
              setSelectedCustomer(found);
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none ${
              theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
            }`}
          >
            {customers.map((c) => (
              <option key={c._id || c.id} value={c._id || c.id} className="bg-slate-900 text-white">
                {c.fullName} ({c.phoneE164 || c.phone})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 font-[title]">
            Avtomobil
          </label>
          <select
            value={selectedVehicle?._id || selectedVehicle?.id || ''}
            onChange={(e) => {
              const found = vehicles.find((v) => (v._id || v.id) === e.target.value);
              setSelectedVehicle(found);
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none ${
              theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
            }`}
          >
            {vehicles.map((v) => (
              <option key={v._id || v.id} value={v._id || v.id} className="bg-slate-900 text-white">
                {v.plateNumber} — {v.make} {v.model}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 font-[title]">
            Tekshiruv Probegi (km)
          </label>
          <input
            type="number"
            value={odometerKm}
            onChange={(e) => setOdometerKm(e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none ${
              theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
            }`}
          />
        </div>
      </div>

      {/* 15 Inspection Checkpoints Form */}
      <div
        className={`p-6 rounded-3xl border space-y-6 ${
          theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
        }`}
      >
        <h2 className="text-base font-bold font-[title] border-b border-inherit pb-3 flex items-center gap-2 text-primary">
          <ShieldCheck size={18} />
          <span>Texnik Nazorat Nuqtalari Natijalari</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Item 1: Engine Oil */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              theme ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Droplet size={18} />
              </div>
              <div>
                <p className="text-xs font-bold font-[title]">1. Dvigatel Moyi Darajasi</p>
                <p className="text-[11px] text-gray-400">Dipstick shup bo‘yicha</p>
              </div>
            </div>
            <select
              value={checklist.engineOilLevel}
              onChange={(e) => setChecklist({ ...checklist, engineOilLevel: e.target.value })}
              className={`px-3 py-1.5 rounded-xl border text-xs outline-none ${
                theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
              }`}
            >
              <option value="OK">Normada (Max/Min o‘rtasi)</option>
              <option value="REPLACE">Almashtirish vaqti kelgan</option>
              <option value="CRITICAL">Kritik darajada kam</option>
            </select>
          </div>

          {/* Item 2: Oil Filter */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              theme ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <CircleGauge size={18} />
              </div>
              <div>
                <p className="text-xs font-bold font-[title]">2. Moy Filtri</p>
                <p className="text-[11px] text-gray-400">Har moy almashtirishda</p>
              </div>
            </div>
            <select
              value={checklist.oilFilter}
              onChange={(e) => setChecklist({ ...checklist, oilFilter: e.target.value })}
              className={`px-3 py-1.5 rounded-xl border text-xs outline-none ${
                theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
              }`}
            >
              <option value="OK">Yangi o‘rnatildi</option>
              <option value="REPLACE">Almashtirish lozim</option>
            </select>
          </div>

          {/* Item 3: Air Filter */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              theme ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Wind size={18} />
              </div>
              <div>
                <p className="text-xs font-bold font-[title]">3. Dvigatel Havo Filtri</p>
                <p className="text-[11px] text-gray-400">Dvigatel nafas yo‘li</p>
              </div>
            </div>
            <select
              value={checklist.airFilter}
              onChange={(e) => setChecklist({ ...checklist, airFilter: e.target.value })}
              className={`px-3 py-1.5 rounded-xl border text-xs outline-none ${
                theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
              }`}
            >
              <option value="CLEAN">Toza</option>
              <option value="DIRTY">Chang, qoqib tozalash</option>
              <option value="URGENT">Zudlik bilan yangilash</option>
            </select>
          </div>

          {/* Item 4: Brake Fluid */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              theme ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                <Disc size={18} />
              </div>
              <div>
                <p className="text-xs font-bold font-[title]">4. Tormoz Suyuqligi (DOT 4)</p>
                <p className="text-[11px] text-gray-400">Namlik tester ko‘rsatkichi</p>
              </div>
            </div>
            <select
              value={checklist.brakeFluidMoisture}
              onChange={(e) => setChecklist({ ...checklist, brakeFluidMoisture: e.target.value })}
              className={`px-3 py-1.5 rounded-xl border text-xs outline-none ${
                theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
              }`}
            >
              <option value="OK">Namlik &lt; 1% (A'lo)</option>
              <option value="WARN">Namlik 2-3% (Diqqat)</option>
              <option value="DANGER">Namlik &gt; 4% (Xavfli, almashtiring)</option>
            </select>
          </div>

          {/* Item 5: Coolant */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              theme ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <ThermometerSnowflake size={18} />
              </div>
              <div>
                <p className="text-xs font-bold font-[title]">5. Antifriz (Sovutish)</p>
                <p className="text-[11px] text-gray-400">Refraktometr / Zichlik</p>
              </div>
            </div>
            <select
              value={checklist.coolantAntifreeze}
              onChange={(e) => setChecklist({ ...checklist, coolantAntifreeze: e.target.value })}
              className={`px-3 py-1.5 rounded-xl border text-xs outline-none ${
                theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
              }`}
            >
              <option value="OK">-38°C Normada</option>
              <option value="LOW">Sathi past, quyish kerak</option>
              <option value="REPLACE">Rangi o‘zgargan, yangilash</option>
            </select>
          </div>

          {/* Item 6: Battery */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              theme ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Battery size={18} />
              </div>
              <div>
                <p className="text-xs font-bold font-[title]">6. Akkumulyator Quvvati</p>
                <p className="text-[11px] text-gray-400">Voltmetr ko‘rsatkichi</p>
              </div>
            </div>
            <input
              value={checklist.batteryVoltage}
              onChange={(e) => setChecklist({ ...checklist, batteryVoltage: e.target.value })}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono outline-none text-right w-44 ${
                theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
              }`}
            />
          </div>
        </div>

        {/* Technician Conclusion */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 font-[title]">
            Usta Xulosasi va Mijozga Tavsiyalar
          </label>
          <textarea
            rows={3}
            value={technicianNotes}
            onChange={(e) => setTechnicianNotes(e.target.value)}
            className={`w-full px-4 py-3 rounded-2xl border text-xs outline-none transition ${
              theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
