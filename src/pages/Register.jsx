import { ArrowRight, Building2, Eye, EyeOff, Loader2, LockKeyhole, Mail, Moon, Phone, ShieldAlert, Sparkles, Sun, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import logo from '../assets/media.png';
import RegisterSwiper from '../components/swiper/RegisterSwiper';
import { translations } from '../i18n/translations';
import { activ } from '../Redux/theme';

export default function Register() {
  const theme = useSelector((state) => state.themes.theme);
  const locale = useSelector((state) => state.language.language);
  const dict = translations[locale] || translations.uz;
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    name: '',
    organizationName: '',
    email: '',
    phone: '+998',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = 'Lubrix | Ro‘yxatdan o‘tish';
  }, []);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function handleProceedToPayment(event) {
    event.preventDefault();

    if (!form.name || !form.organizationName || !form.email || !form.password) {
      toast.error('Iltimos, barcha majburiy maydonlarni to‘ldiring');
      return;
    }

    if (form.password.length < 8) {
      toast.error('Parol kamida 8 ta belgidan iborat bo‘lishi kerak');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Kiritilgan parollar mos kelmadi');
      return;
    }

    // Saqlab qo'yamiz va tarif/to'lov bosqichiga yo'naltiramiz
    sessionStorage.setItem('lubrix_register_intent', JSON.stringify({
      name: form.name,
      organizationName: form.organizationName,
      email: form.email,
      phone: form.phone,
      password: form.password,
    }));

    toast.info('Ma‘lumotlar qabul qilindi. Iltimos, xizmat ko‘rsatish tarifini tanlang va to‘lovni amalga oshiring.');
    navigate('/plans');
  }

  const inputClass = `w-full bg-transparent outline-none text-sm placeholder:text-gray-500`;

  return (
    <div
      className={`fixed inset-0 h-dvh w-full overflow-y-auto transition-colors duration-200 ${
        theme ? 'bg-surface text-white' : 'bg-white text-gray-900'
      }`}
    >
      <div className="flex min-h-full flex-row-reverse">
        <RegisterSwiper />

        <div className="relative flex min-h-dvh w-full flex-col items-center justify-center px-6 py-16 lg:w-1/2">
          <button
            onClick={() => dispatch(activ())}
            className={`flex cursor-pointer absolute bottom-[20px] left-[20px] z-30 items-center rounded-lg p-2 ${
              theme ? 'hover:bg-white/20 text-white' : 'text-gray-500 transition hover:bg-gray-100'
            }`}
            title="Mavzuni almashtirish"
          >
            {theme ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <Link to="/" className="absolute left-6 top-6 flex items-center gap-3">
            <img src={logo} alt="Lubrix" className="w-10 sm:w-11" />
            <div>
              <p className="font-brand text-xl sm:text-2xl tracking-widest text-primary font-bold">LUBRIX</p>
              <p className="text-[9px] tracking-wider text-gray-400">
                Smarter Oil Change CRM
              </p>
            </div>
          </Link>

          <div className="w-full max-w-md">
            <div className="mb-4">
              <h1 className="font-[title] text-2xl sm:text-3xl font-bold tracking-wide">
                {dict.auth.createAccount}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-400">
                Avtoservisingiz barcha jarayonlarini to‘liq raqamlashtiring.
              </p>
            </div>

            {/* Oldindan ogohlantirish baneri */}
            <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-start gap-2.5 text-xs leading-relaxed">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Diqqat: To‘lov majburiy bosqich hisoblanadi</p>
                <p className="text-amber-300/80 mt-0.5 text-[11px]">
                  Ma'lumotlaringiz to‘ldirilgach, tarif tanlanadi va to‘lov tasdiqlangandan so‘ng akkaunt avtomatik faollashtiriladi.
                </p>
              </div>
            </div>

            <form onSubmit={handleProceedToPayment} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  {dict.auth.fullName} *
                </label>
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition ${
                    theme
                      ? 'border-white/10 bg-white/5 focus-within:border-primary'
                      : 'border-gray-200 bg-gray-50 focus-within:border-primary'
                  }`}
                >
                  <User size={18} className="text-gray-400 shrink-0" />
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Alisher Zokirov"
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Servis yoki Kompaniya nomi *
                </label>
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition ${
                    theme
                      ? 'border-white/10 bg-white/5 focus-within:border-primary'
                      : 'border-gray-200 bg-gray-50 focus-within:border-primary'
                  }`}
                >
                  <Building2 size={18} className="text-gray-400 shrink-0" />
                  <input
                    name="organizationName"
                    value={form.organizationName}
                    onChange={handleChange}
                    placeholder="Lubrix Avto Servis"
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    {dict.auth.email} *
                  </label>
                  <div
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition ${
                      theme
                        ? 'border-white/10 bg-white/5 focus-within:border-primary'
                        : 'border-gray-200 bg-gray-50 focus-within:border-primary'
                    }`}
                  >
                    <Mail size={16} className="text-gray-400 shrink-0" />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="info@servis.uz"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    {dict.auth.phone}
                  </label>
                  <div
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition ${
                      theme
                        ? 'border-white/10 bg-white/5 focus-within:border-primary'
                        : 'border-gray-200 bg-gray-50 focus-within:border-primary'
                    }`}
                  >
                    <Phone size={16} className="text-gray-400 shrink-0" />
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+998 90 123 45 67"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    {dict.auth.password} *
                  </label>
                  <div
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition ${
                      theme
                        ? 'border-white/10 bg-white/5 focus-within:border-primary'
                        : 'border-gray-200 bg-gray-50 focus-within:border-primary'
                    }`}
                  >
                    <LockKeyhole size={16} className="text-gray-400 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Min 8 ta belgi"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    {dict.auth.confirmPassword} *
                  </label>
                  <div
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition ${
                      theme
                        ? 'border-white/10 bg-white/5 focus-within:border-primary'
                        : 'border-gray-200 bg-gray-50 focus-within:border-primary'
                    }`}
                  >
                    <LockKeyhole size={16} className="text-gray-400 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Qayta kiriting"
                      required
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-blue-600 text-white font-[title] tracking-wider text-sm font-semibold transition cursor-pointer shadow-lg shadow-blue-500/25"
              >
                <span>TARIF VA TO‘LOVGA O‘TISH</span>
                <ArrowRight size={16} />
              </button>

              <div className="mt-2 flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-400">
                <span>{dict.auth.alreadyHave}</span>
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  {dict.auth.signIn}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
