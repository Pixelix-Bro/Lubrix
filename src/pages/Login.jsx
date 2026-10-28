import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Moon, Sparkles, Sun } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import logo from '../assets/media.png';
import LoginSwiper from '../components/swiper/LoginSwiper';
import { translations } from '../i18n/translations';
import { loginFailure, loginStart, loginSuccess } from '../Redux/auth';
import { activ } from '../Redux/theme';
import { lubrixApi } from '../services/api';

export default function Login() {
  const theme = useSelector((state) => state.themes.theme);
  const locale = useSelector((state) => state.language.language);
  const dict = translations[locale] || translations.uz;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Lubrix | Kirish';
  }, []);

  const fillDemoAccount = () => {
    setEmail('test1@gmail.com');
    setPassword('test1');
    toast.info('Demo akkaunt ma‘lumotlari kiritildi (test1@gmail.com / test1)');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Iltimos, elektron pochta va parolni kiriting');
      return;
    }

    try {
      setLoading(true);
      dispatch(loginStart());

      const res = await lubrixApi.login({ email, password });
      if (res.data?.success && res.data?.token) {
        dispatch(
          loginSuccess({
            token: res.data.token,
            user: res.data.user,
          })
        );
        toast.success(`Xush kelibsiz, ${res.data.user?.name || 'Foydalanuvchi'}!`);
        navigate('/');
      } else {
        throw new Error(res.data?.error || 'Kirishda xatolik yuz berdi');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Elektron pochta yoki parol noto‘g‘ri';
      toast.error(msg);
      dispatch(loginFailure(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`absolute top-0 left-0 h-screen w-screen transition-colors duration-200 font-sans ${
        theme ? 'bg-surface text-white' : 'bg-white text-gray-900'
      }`}
    >
      <div className="flex w-full h-screen">
        <LoginSwiper />

        <div className="lg:w-[50%] relative w-full h-full flex justify-center items-center flex-col px-6">
          <button
            onClick={() => dispatch(activ())}
            className={`flex cursor-pointer absolute bottom-5 right-5 z-30 items-center rounded-xl p-2.5 border transition ${
              theme ? 'border-white/10 hover:bg-white/10 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
            title={dict.ui.themeToggle}
          >
            {theme ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Logo Header */}
          <div className="absolute right-6 top-6 z-50 flex items-center gap-3">
            <img src={logo} alt="Lubrix Logo" className="w-9 sm:w-11" />
            <div>
              <p className="font-brand text-lg sm:text-xl tracking-wider text-primary font-bold">LUBRIX</p>
              <p className="text-[10px] tracking-wide text-gray-400">
                Avtoservis Boshqaruv Tizimi
              </p>
            </div>
          </div>

          <div className="w-full max-w-md">
            <div className="mb-6 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold font-[title] tracking-tight mb-2">
                {dict.auth.loginTitle}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                {dict.auth.loginSubtitle}
              </p>
            </div>

            {/* Quick Demo Account Button */}
            <div className="mb-5">
              <button
                type="button"
                onClick={fillDemoAccount}
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Sparkles size={15} />
                <span>Demo hisob bilan tezkor kirish (test1@gmail.com)</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  {dict.auth.email}
                </label>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition ${
                    theme
                      ? 'border-white/10 bg-white/5 focus-within:border-primary'
                      : 'border-gray-200 bg-gray-50 focus-within:border-primary'
                  }`}
                >
                  <Mail size={17} className="text-gray-400 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@lubrix.uz yoki test1@gmail.com"
                    required
                    className="w-full bg-transparent outline-none text-sm placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  {dict.auth.password}
                </label>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition ${
                    theme
                      ? 'border-white/10 bg-white/5 focus-within:border-primary'
                      : 'border-gray-200 bg-gray-50 focus-within:border-primary'
                  }`}
                >
                  <Lock size={17} className="text-gray-400 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-transparent outline-none text-sm placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-blue-600 text-white font-semibold text-sm transition disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-500/25"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{dict.ui.loading}</span>
                  </>
                ) : (
                  <>
                    <span>{dict.auth.signIn}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Direct Link to /plans */}
              <div className="mt-4 text-center text-xs text-gray-400">
                <span>{dict.auth.noAccount} </span>
                <Link to="/plans" className="font-bold text-primary hover:underline">
                  {dict.auth.signUp} ({dict.pricing?.choosePlan || 'Tarif tanlash'})
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
