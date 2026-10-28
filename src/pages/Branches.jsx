import {
  AlertCircle,
  Building2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Search,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { lubrixApi } from '../services/api';
import { lubrixSocket } from '../services/socket';

export default function Branches() {
  const theme = useSelector((state) => state.themes.theme);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('+99871');
  const [workingHours, setWorkingHours] = useState('08:30 - 20:30');

  const loadBranches = async () => {
    try {
      setLoading(true);
      const res = await lubrixApi.getBranches();
      setBranches(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();

    const unsub = lubrixSocket.subscribe('branch:created', (newBranch) => {
      setBranches((prev) => [...prev, newBranch]);
    });
    return () => unsub();
  }, []);

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!name || !address) {
      setError('Filial nomi va manzili kiritilishi shart');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await lubrixApi.createBranch({
        name,
        address,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        phone,
        workingHours,
      });

      setIsModalOpen(false);
      setName('');
      setAddress('');
      setLatitude('');
      setLongitude('');
      await loadBranches();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide flex items-center gap-2.5">
            <MapPin className="text-primary" size={24} />
            <span>Servis Filiallari (Multi-Branch)</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Kompaniyangizga tegishli barcha filiallar, ularning manzili va ish tartibi
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-medium text-sm transition shadow-lg shadow-blue-500/20 shrink-0"
        >
          <Plus size={18} />
          <span>Yangi Filial Qo‘shish</span>
        </button>
      </div>

      {/* Branches Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={32} className="animate-spin text-primary mb-2" />
        </div>
      ) : branches.length === 0 ? (
        <div
          className={`p-12 text-center rounded-2xl border ${
            theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white'
          }`}
        >
          <Building2 size={44} className="mx-auto text-gray-500 mb-3" />
          <p className="text-base font-semibold">Hozircha filiallar kiritilmagan</p>
          <p className="text-xs text-gray-500 mt-1">Yangi filial qo‘shib tizimni kengaytiring</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {branches.map((b) => {
            const mapUrl =
              b.latitude && b.longitude
                ? `https://maps.google.com/?q=${b.latitude},${b.longitude}`
                : `https://maps.google.com/?q=${encodeURIComponent(b.address)}`;

            return (
              <div
                key={b._id || b.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition hover:border-primary/50 ${
                  theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-base font-bold font-[title] text-primary">{b.name}</h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Faol
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-gray-400">
                    <div className="flex items-start gap-2">
                      <MapPin size={15} className="text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-gray-300">{b.address}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock size={15} className="text-amber-500 shrink-0" />
                      <span>{b.workingHours || '08:30 - 20:30'}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      <Phone size={15} className="text-emerald-500 shrink-0" />
                      <span>{b.phone || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-inherit flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">Moy ombori: Bog‘langan</span>
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition"
                  >
                    <Navigation size={13} />
                    <span>Xaritada</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Branch Modal */}
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
              <Building2 className="text-primary" size={20} />
              <span>Yangi Filial Qo‘shish</span>
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Xizmat ko‘rsatish manzilini va kontaktlarini kiriting
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                  Filial Nomi *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Lubrix Yunusobod Filiali"
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
                  Manzil (Ko‘cha, mo‘ljal) *
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Toshkent sh., Yunusobod tumani, 4-mavze 12-uy"
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
                    Telefon Raqami
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998712001122"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Ish Vaqti
                  </label>
                  <input
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="08:30 - 20:30"
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
                    Kenglik (Latitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="41.3111"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none transition ${
                      theme
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 font-[title]">
                    Uzunlik (Longitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="69.2797"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none transition ${
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
                    <span>Filialni Saqlash</span>
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
