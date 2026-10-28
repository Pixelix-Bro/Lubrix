import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  Droplet,
  ExternalLink,
  Filter,
  Gauge,
  HelpCircle,
  Info,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export default function OilSelector() {
  const theme = useSelector((state) => state.themes.theme);
  const navigate = useNavigate();

  const [selectedMake, setSelectedMake] = useState('Chevrolet');
  const [search, setSearch] = useState('');
  const [selectedCar, setSelectedCar] = useState(null);

  // Uzbek Automotive Fleet Oil Recommendations Database
  const carDatabase = [
    // Chevrolet Models
    {
      id: 'ch-cobalt',
      make: 'Chevrolet',
      model: 'Cobalt 1.5 DOHC',
      yearRange: '2013 - 2026',
      engine: '1.5L B15D2 (4-silindr)',
      viscosity: '5W-30',
      alternativeViscosity: '5W-40',
      standard: 'GM Dexos 1 Gen 3 / API SP',
      capacityLiters: 3.75,
      intervalKm: 7500,
      intervalDays: 90,
      filterType: 'W 712/75 (Cobalt/Gentra)',
      notes: 'Zavod talabi bo‘yicha sintetik GM Dexos 1 tavsiya etiladi.',
    },
    {
      id: 'ch-gentra',
      make: 'Chevrolet',
      model: 'Lacetti / Gentra 1.5',
      yearRange: '2013 - 2024',
      engine: '1.5L B15D2',
      viscosity: '5W-30',
      alternativeViscosity: '5W-40',
      standard: 'GM Dexos 1 / API SN Plus',
      capacityLiters: 3.75,
      intervalKm: 7500,
      intervalDays: 90,
      filterType: 'W 712/75',
      notes: 'Gaz uskunasi (metan/propan) o‘rnatilgan bo‘lsa 5W-40 ham ruxsat etiladi.',
    },
    {
      id: 'ch-tracker2',
      make: 'Chevrolet',
      model: 'Tracker 2 (1.2 Turbo)',
      yearRange: '2021 - 2026',
      engine: '1.2L CSS Prime 3-silindr Turbo',
      viscosity: '0W-20',
      alternativeViscosity: '5W-30 (Faqat Dexos1 Gen3)',
      standard: 'GM Dexos 1 Gen 3 (Majburiy)',
      capacityLiters: 4.0,
      intervalKm: 6000,
      intervalDays: 90,
      filterType: 'Maxsus kassetali filtr',
      notes: 'Moy ichidagi tishli kamar (Wet Timing Belt) tufayli faqat Dexos 1 Gen 3 quyilishi SHART!',
    },
    {
      id: 'ch-malibu2',
      make: 'Chevrolet',
      model: 'Malibu 2.0 Turbo',
      yearRange: '2017 - 2024',
      engine: '2.0L LTG Ecotec Turbo',
      viscosity: '5W-30',
      alternativeViscosity: '0W-30',
      standard: 'GM Dexos 1 Gen 3 / API SP-RC',
      capacityLiters: 4.7,
      intervalKm: 7000,
      intervalDays: 90,
      filterType: 'PF64 / W 7058',
      notes: 'Turbomotor tufayli LSPI (erta alangalanuvchi) ga qarshi moy talab qilinadi.',
    },
    {
      id: 'ch-onix',
      make: 'Chevrolet',
      model: 'Onix 1.2 Turbo / Atmosfera',
      yearRange: '2022 - 2026',
      engine: '1.2L CSS Prime',
      viscosity: '0W-20',
      alternativeViscosity: '5W-30 Dexos 1 Gen 3',
      standard: 'GM Dexos 1 Gen 3',
      capacityLiters: 4.0,
      intervalKm: 6500,
      intervalDays: 90,
      filterType: 'Original GM',
      notes: 'Dvigatel moyi kamar bilan to‘g‘ridan-to‘g‘ri aloqada. Noto‘g‘ri moy kamarni yemirishi mumkin!',
    },
    {
      id: 'ch-damas',
      make: 'Chevrolet',
      model: 'Damas / Labo 0.8',
      yearRange: '1996 - 2026',
      engine: '0.8L F8CV (3-silindr)',
      viscosity: '10W-40',
      alternativeViscosity: '5W-40',
      standard: 'API SL / SM',
      capacityLiters: 3.0,
      intervalKm: 5000,
      intervalDays: 60,
      filterType: 'W 67/1',
      notes: 'Yuk tashuvchi sharoitda moy almashtirish oralig‘i 5,000 km dan oshmasligi kerak.',
    },

    // Kia Models
    {
      id: 'kia-k5',
      make: 'Kia',
      model: 'Kia K5 2.0 / 2.5 GDI',
      yearRange: '2020 - 2026',
      engine: 'Smartstream G2.0 / G2.5',
      viscosity: '0W-20',
      alternativeViscosity: '5W-20 / 5W-30',
      standard: 'API SP / ILSAC GF-6A',
      capacityLiters: 4.3,
      intervalKm: 7500,
      intervalDays: 90,
      filterType: 'Kia 26350-2J000',
      notes: 'Yuqori samaradorlik va yoqilg‘i tejami uchun 0W-20 eng maqbul.',
    },
    {
      id: 'kia-sonet',
      make: 'Kia',
      model: 'Kia Sonet 1.5 Smartstream',
      yearRange: '2024 - 2026',
      engine: '1.5L Gamma II MPI',
      viscosity: '5W-30',
      alternativeViscosity: '0W-20',
      standard: 'API SP / ILSAC GF-6',
      capacityLiters: 3.8,
      intervalKm: 7500,
      intervalDays: 90,
      filterType: 'Hyundai/Kia OEM',
      notes: 'O‘zbekiston iqlimi uchun 5W-30 sintetik moy tavsiya etiladi.',
    },

    // BYD Models
    {
      id: 'byd-song',
      make: 'BYD',
      model: 'BYD Song Plus DM-i (Gibrid)',
      yearRange: '2021 - 2026',
      engine: '1.5L Xiaoyun Dedicated Hybrid Engine',
      viscosity: '0W-20',
      alternativeViscosity: '0W-16',
      standard: 'API SP / ILSAC GF-6B (Hybrid Optimized)',
      capacityLiters: 3.5,
      intervalKm: 7500,
      intervalDays: 180,
      filterType: 'BYD Original OEM',
      notes: 'Gibrid dvigatel tez-tez sovuq start olgani sababli 0W-20 kam viskoziteli toza sintetika zarur.',
    },
    {
      id: 'byd-chazor',
      make: 'BYD',
      model: 'BYD Chazor (Destroyer 05)',
      yearRange: '2022 - 2026',
      engine: '1.5L DM-i PHEV',
      viscosity: '0W-20',
      alternativeViscosity: '0W-16',
      standard: 'API SP',
      capacityLiters: 3.5,
      intervalKm: 7500,
      intervalDays: 180,
      filterType: 'BYD Original',
      notes: 'Gibrid tizimlar uchun sertifikatlangan moy.',
    },

    // Hyundai Models
    {
      id: 'hy-elantra',
      make: 'Hyundai',
      model: 'Hyundai Elantra 1.6 / 2.0',
      yearRange: '2020 - 2026',
      engine: 'Smartstream 1.6L / 2.0L',
      viscosity: '0W-20',
      alternativeViscosity: '5W-30',
      standard: 'API SP / ILSAC GF-6',
      capacityLiters: 4.0,
      intervalKm: 7500,
      intervalDays: 90,
      filterType: '26300-35505',
      notes: 'Gidrotoklovchi va klapanlar tozaligi uchun sintetik moy zarur.',
    },

    // Toyota Models
    {
      id: 'ty-camry',
      make: 'Toyota',
      model: 'Toyota Camry 2.5 (XV70)',
      yearRange: '2018 - 2024',
      engine: '2.5L Dynamic Force (A25A-FKS)',
      viscosity: '0W-16',
      alternativeViscosity: '0W-20',
      standard: 'Toyota Genuine / API SP ILSAC GF-6B',
      capacityLiters: 4.5,
      intervalKm: 8000,
      intervalDays: 90,
      filterType: '04152-YZZA1',
      notes: 'Dynamic Force motorlari o‘ta past viskoziteli 0W-16 / 0W-20 moylarga mo‘ljallangan.',
    },
  ];

  const makes = ['Chevrolet', 'Kia', 'BYD', 'Hyundai', 'Toyota'];

  const filteredCars = carDatabase.filter((c) => {
    const matchesMake = selectedMake === 'ALL' || c.make === selectedMake;
    const q = search.toLowerCase();
    const matchesSearch =
      c.model.toLowerCase().includes(q) ||
      c.engine.toLowerCase().includes(q) ||
      c.viscosity.toLowerCase().includes(q);
    return matchesMake && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Droplet className="text-primary" size={24} />
            <span>Moy Tanlash Katalogi</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Avtomobil rusumi bo‘yicha zavod talabi, karter hajmi, viskozitet va mos moylar bazasi
          </p>
        </div>

        {/* Quick Search Input */}
        <div
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border sm:w-72 ${
            theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
          }`}
        >
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Model yoki motor kodi..."
            className="w-full bg-transparent outline-none text-xs placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Brand Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedMake('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold font-[title] transition ${
            selectedMake === 'ALL'
              ? 'bg-primary text-white shadow-sm'
              : 'border border-inherit text-gray-400 hover:text-white'
          }`}
        >
          Barchasi ({carDatabase.length})
        </button>
        {makes.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMake(m)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-[title] transition ${
              selectedMake === m
                ? 'bg-primary text-white shadow-sm'
                : 'border border-inherit text-gray-400 hover:text-white'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Main Grid: Cars List + Selected Car Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cars Catalog Cards (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredCars.map((car) => {
              const isSelected = selectedCar?.id === car.id;
              return (
                <div
                  key={car.id}
                  onClick={() => setSelectedCar(car)}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : theme
                      ? 'border-white/10 bg-surface hover:border-white/30'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-[title]">
                        {car.make}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-xs font-bold">
                        {car.viscosity}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold font-[title]">{car.model}</h3>
                    <p className="text-xs text-gray-400 mt-1">{car.engine}</p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-inherit flex items-center justify-between text-xs text-gray-400">
                    <span className="font-mono">Karter: {car.capacityLiters} L</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <span>Tafsilot</span>
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Car Recommendation Panel (5 Cols) */}
        <div className="lg:col-span-5">
          {selectedCar ? (
            <div
              className={`p-6 rounded-3xl border space-y-5 sticky top-20 shadow-2xl ${
                theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
              }`}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary font-[title]">
                  ZAVOD TAVSIYANOMASI
                </span>
                <h2 className="text-lg font-bold font-[title] mt-1">{selectedCar.model}</h2>
                <p className="text-xs text-gray-400">{selectedCar.yearRange} · {selectedCar.engine}</p>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div
                  className={`p-3 rounded-xl border ${
                    theme ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <p className="text-[10px] text-gray-400 font-[title] uppercase">Asosiy Viskozitet</p>
                  <p className="text-base font-bold text-amber-400 font-mono mt-1">
                    {selectedCar.viscosity}
                  </p>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    theme ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <p className="text-[10px] text-gray-400 font-[title] uppercase">Moy Hajmi (Litr)</p>
                  <p className="text-base font-bold text-emerald-400 font-mono mt-1">
                    {selectedCar.capacityLiters} Litr
                  </p>
                </div>

                <div
                  className={`p-3 rounded-xl border col-span-2 ${
                    theme ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <p className="text-[10px] text-gray-400 font-[title] uppercase">Zavod Standarti</p>
                  <p className="font-semibold text-xs text-primary font-mono mt-1">
                    {selectedCar.standard}
                  </p>
                </div>
              </div>

              {/* Warnings and Notes */}
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2">
                <Info size={16} className="shrink-0 mt-0.5 text-blue-400" />
                <p className="leading-relaxed">{selectedCar.notes}</p>
              </div>

              {/* Intervals and Filter */}
              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex items-center justify-between py-1.5 border-b border-inherit">
                  <span className="text-gray-400">Tavsiya oralig‘i:</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {selectedCar.intervalKm.toLocaleString()} km yoki {selectedCar.intervalDays} kun
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-inherit">
                  <span className="text-gray-400">Moy filtri kodi:</span>
                  <span className="font-mono font-semibold">{selectedCar.filterType}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-gray-400">Muqobil viskozitet:</span>
                  <span className="font-mono text-gray-300">{selectedCar.alternativeViscosity}</span>
                </div>
              </div>

              {/* Direct Actions */}
              <button
                onClick={() => {
                  navigate(
                    `/services?brand=Castrol&viscosity=${selectedCar.viscosity}&qty=${selectedCar.capacityLiters}&autoOpen=true`
                  );
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-primary hover:bg-blue-600 text-white font-[title] font-bold text-xs tracking-wider transition shadow-lg shadow-blue-500/25"
              >
                <Wrench size={15} />
                <span>USHBU MOY BILAN XIZMAT OCHISH</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div
              className={`p-10 rounded-3xl border text-center flex flex-col items-center justify-center h-full min-h-[350px] ${
                theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
              }`}
            >
              <Car size={44} className="text-gray-500 mb-3" />
              <h3 className="text-sm font-bold font-[title]">Avtomobilni tanlang</h3>
              <p className="text-xs text-gray-400 max-w-xs mt-1">
                Chap tomondagi ro‘yxatdan avtomobil rusumini tanlasangiz, zavod talabi va moy hajmi ko‘rsatiladi.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
