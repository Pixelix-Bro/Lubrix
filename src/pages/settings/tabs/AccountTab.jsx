import { AlertCircle, CheckCircle2, Eye, EyeOff, Key, Loader2, Save, Upload, User } from 'lucide-react';
import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { updateUser } from '../../../Redux/auth';
import { lubrixApi } from '../../../services/api';

/**
 * AccountTab — Profil & Parol tab
 */
export default function AccountTab() {
  const theme    = useSelector((s) => s.themes.theme);
  const authUser = useSelector((s) => s.auth?.user);
  const dispatch = useDispatch();

  const [profileData, setProfileData] = useState({
    name:            authUser?.name     || '',
    phone:           authUser?.phone    || '+998',
    avatarUrl:       authUser?.avatarUrl|| '',
    currentPassword: '',
    newPassword:     '',
  });
  const [saving,       setSaving      ] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg,     setErrorMsg    ] = useState('');
  const [showPass,     setShowPass    ] = useState(false);
  const fileRef = useRef(null);

  const inputCls = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition ${
    theme
      ? 'border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-primary/50'
      : 'border-gray-200 bg-white text-gray-900 focus:border-primary/50'
  }`;

  // Avatar upload
  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Rasm hajmi 2MB dan kichik bo‘lishi kerak');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result;
      setProfileData((p) => ({ ...p, avatarUrl: base64 }));
      try {
        const res = await lubrixApi.updateProfile({ avatarUrl: base64 });
        if (res.data?.data) dispatch(updateUser({ avatarUrl: base64 }));
      } catch (err) { console.error('Avatar upload error:', err); }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true); setErrorMsg('');
      const res = await lubrixApi.updateProfile({
        name:            profileData.name,
        phone:           profileData.phone,
        avatarUrl:       profileData.avatarUrl,
        currentPassword: profileData.currentPassword || undefined,
        newPassword:     profileData.newPassword     || undefined,
      });
      if (res.data?.data) dispatch(updateUser(res.data.data));
      setSavedSuccess(true);
      setProfileData((p) => ({ ...p, currentPassword: '', newPassword: '' }));
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Xatolik yuz berdi');
    } finally { setSaving(false); }
  };

  const initials = profileData.name?.charAt(0)?.toUpperCase() || 'A';

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {profileData.avatarUrl ? (
            <img
              src={profileData.avatarUrl}
              alt="Avatar"
              className="w-16 h-16 rounded-xl object-cover border-2 border-primary/50"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl">
              {initials}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-primary text-white shadow-md hover:bg-blue-600 transition"
          >
            <Upload size={11} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
        </div>
        <div>
          <p className="text-sm font-bold">{profileData.name || 'Administrator'}</p>
          <p className="text-xs text-gray-400">{authUser?.email}</p>
          <span className={`text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono mt-1 inline-block`}>
            {authUser?.role || 'OWNER'}
          </span>
        </div>
      </div>

      {/* Asosiy ma'lumotlar */}
      <div>
        <h3 className="text-sm font-bold font-[title] flex items-center gap-2 mb-4">
          <User size={14} className="text-primary" /> Shaxsiy Ma'lumotlar
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-semibold mb-1 ${theme ? 'text-gray-300' : 'text-gray-600'}`}>
              To'liq Ism *
            </label>
            <input
              type="text" required
              value={profileData.name}
              onChange={(e) => setProfileData((p) => ({ ...p, name: e.target.value }))}
              className={inputCls}
              placeholder="Ism Familiya"
            />
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1 ${theme ? 'text-gray-300' : 'text-gray-600'}`}>
              Telefon
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData((p) => ({ ...p, phone: e.target.value }))}
              className={inputCls}
              placeholder="+998901234567"
            />
          </div>
        </div>
      </div>

      {/* Parol */}
      <div>
        <h3 className="text-sm font-bold font-[title] flex items-center gap-2 mb-4">
          <Key size={14} className="text-primary" /> Parolni O'zgartirish
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-semibold mb-1 ${theme ? 'text-gray-300' : 'text-gray-600'}`}>
              Joriy Parol
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={profileData.currentPassword}
                onChange={(e) => setProfileData((p) => ({ ...p, currentPassword: e.target.value }))}
                className={`${inputCls} pr-10`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1 ${theme ? 'text-gray-300' : 'text-gray-600'}`}>
              Yangi Parol
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={profileData.newPassword}
              onChange={(e) => setProfileData((p) => ({ ...p, newPassword: e.target.value }))}
              className={inputCls}
              placeholder="Kamida 8 ta belgi"
            />
          </div>
        </div>
      </div>

      {errorMsg    && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"><AlertCircle size={14} />{errorMsg}</div>}
      {savedSuccess && <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"><CheckCircle2 size={14} />Profil muvaffaqiyatli yangilandi!</div>}

      <button
        type="submit" disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white text-sm font-semibold transition disabled:opacity-60"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'Saqlanmoqda...' : 'Profilni Saqlash'}
      </button>
    </form>
  );
}
