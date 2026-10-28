import { ArrowLeft, CheckCircle2, CreditCard, Lock, ShieldCheck, User, Sparkles } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CardModal from '../components/mini/Cardinput';
import {
  UzcardIcon,
  HumoIcon,
  ClickIcon,
  PaymeIcon,
  UzumIcon,
  VisaIcon,
  MastercardIcon,
} from '../components/payment/CardIcons';
import { monthlyPlans, yearlyPlans } from '../data/root';
import { translations } from '../i18n/translations';
import { loginSuccess } from '../Redux/auth';
import { lubrixApi } from '../services/api';

const METHODS = [
  { id: 1, name: 'Uzcard / Humo', provider: 'UZCARD', type: 'CARD', badge: 'Plastik Karta', Icon: UzcardIcon },
  { id: 2, name: 'Click Up', provider: 'CLICK', type: 'ONLINE', badge: '0% Komissiya', Icon: ClickIcon },
  { id: 3, name: 'Payme Business', provider: 'PAYME', type: 'ONLINE', badge: 'Tezkor To‘lov', Icon: PaymeIcon },
  { id: 4, name: 'Uzum Bank', provider: 'UZUM', type: 'ONLINE', badge: 'Bank To‘lovi', Icon: UzumIcon },
];

export default function Checkout() {
  const locale = useSelector((state) => state.language.language);
  const theme = useSelector((state) => state.themes.theme);
  const dict = translations[locale] || translations.uz;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [selectedMethod, setSelectedMethod] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);

  // Read registered intent if user came from register page
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organizationName: '',
    phone: '+998',
    password: '',
  });

  useEffect(() => {
    try {
      const savedIntent = sessionStorage.getItem('lubrix_register_intent');
      if (savedIntent) {
        const parsed = JSON.parse(savedIntent);
        setFormData((prev) => ({
          ...prev,
          name: parsed.name || '',
          email: parsed.email || '',
          organizationName: parsed.organizationName || '',
          phone: parsed.phone || '+998',
          password: parsed.password || '',
        }));
      }
    } catch {
      // ignore
    }
  }, []);

  const selectedPlanId = Number(sessionStorage.getItem('lubrix-plan') || sessionStorage.getItem('plans_id')) || 2;
  const billingCycle = sessionStorage.getItem('lubrix-billing') || sessionStorage.getItem('plans_name') || 'month';

  const plan = useMemo(() => {
    const list = billingCycle === 'year' ? yearlyPlans : monthlyPlans;
    return list.find((p) => p.id === selectedPlanId) || list[1];
  }, [selectedPlanId, billingCycle]);

  const rawPrice = plan ? plan.price : 49;
  const amountStr = `$${rawPrice}.00`;

  const executePayment = async (cardData = null) => {
    if (!formData.email || !formData.organizationName) {
      toast.error('Iltimos, avval elektron pochta va tashkilot nomini kiriting');
      return;
    }

    const currentMethod = METHODS.find((m) => m.id === selectedMethod) || METHODS[0];

    if (currentMethod.type === 'CARD' && !cardData) {
      setModalOpen(true);
      return;
    }

    setModalOpen(false);
    try {
      setLoading(true);
      const res = await lubrixApi.checkoutRegister({
        name: formData.name || 'Servis Egasi',
        email: formData.email,
        organizationName: formData.organizationName || 'Mening Servisim',
        phone: formData.phone,
        password: formData.password || undefined,
        planName: plan.name,
        paymentProvider: currentMethod.provider,
        cardNumber: cardData?.number || '8600 1234 5678 9999',
      });

      if (res.data?.success && res.data?.token) {
        dispatch(
          loginSuccess({
            token: res.data.token,
            user: res.data.user,
          })
        );
        setAccountInfo({
          email: formData.email,
          password: res.data.generatedPassword || formData.password,
          provider: currentMethod.name,
        });
        setOrderComplete(true);
        sessionStorage.removeItem('lubrix_register_intent');
        toast.success('To‘lov muvaffaqiyatli qabul qilindi va hisobingiz faollashtirildi!');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'To‘lovda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleCardSubmitSuccess = (cardData) => {
    executePayment(cardData);
  };

  return (
    <div
      className={`min-h-screen py-8 px-4 sm:px-6 transition-colors duration-200 font-sans ${
        theme ? 'bg-background text-white' : 'bg-gray-50 text-gray-900'
      }`}
    >
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/plans')}
          className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition mb-6"
        >
          <ArrowLeft size={16} />
          <span>Tariflar sahifasiga qaytish</span>
        </button>

        {orderComplete ? (
          <div
            className={`p-8 rounded-3xl border text-center space-y-4 max-w-lg mx-auto ${
              theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-xl'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <h2 className="text-xl font-bold font-[title]">TO‘LOV MUVAFFAQIYATLI AMALGA OSHIRILDI!</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Sizning Lubrix {plan.name} obunangiz faollashtirildi. Kirish ma'lumotlari sizning elektron pochtangizga yuborildi.
            </p>

            {accountInfo && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs font-mono space-y-1">
                <p>Email: <span className="text-primary font-bold">{accountInfo.email}</span></p>
                <p>Parol: <span className="text-amber-400 font-bold">{accountInfo.password}</span></p>
                <p>Usul: <span className="text-emerald-400">{accountInfo.provider}</span></p>
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              className="w-full py-3.5 px-6 rounded-xl bg-primary hover:bg-blue-600 text-white font-semibold text-sm transition shadow-lg shadow-blue-500/25"
            >
              Boshqaruv Paneliga Kirish
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Account Setup & Payment Info (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              <div
                className={`p-6 rounded-3xl border space-y-4 ${
                  theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
                }`}
              >
                <h2 className="text-base font-bold font-[title] flex items-center gap-2">
                  <User size={18} className="text-primary" />
                  <span>1. Tashkilot va Mulkdor Ma'lumotlari</span>
                </h2>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold uppercase">
                      Servis yoki Kompaniya Nomi *
                    </label>
                    <input
                      value={formData.organizationName}
                      onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                      placeholder="Lubrix Avto Servis"
                      required
                      className={`w-full px-3.5 py-2.5 rounded-xl border outline-none ${
                        theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold uppercase">
                        Mulkdor Ismi *
                      </label>
                      <input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Alisher Zokirov"
                        required
                        className={`w-full px-3.5 py-2.5 rounded-xl border outline-none ${
                          theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold uppercase">
                        Telefon Raqami
                      </label>
                      <input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+998901234567"
                        className={`w-full px-3.5 py-2.5 rounded-xl border outline-none font-mono ${
                          theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold uppercase">
                      Elektron Pochta (Parol shu yerga yuboriladi) *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="info@avtoservis.uz"
                      required
                      className={`w-full px-3.5 py-2.5 rounded-xl border outline-none ${
                        theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div
                className={`p-6 rounded-3xl border space-y-4 ${
                  theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
                }`}
              >
                <h2 className="text-base font-bold font-[title] flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-400" />
                  <span>2. To‘lov Usulini Tanlang</span>
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {METHODS.map((m) => {
                    const MethodIcon = m.Icon;
                    const isSelected = selectedMethod === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMethod(m.id)}
                        className={`p-3 rounded-2xl border cursor-pointer flex flex-col items-center justify-center gap-2 transition text-center ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-lg scale-[1.02]'
                            : 'border-inherit hover:border-gray-500'
                        }`}
                      >
                        <div className="h-8 flex items-center justify-center">
                          <MethodIcon className="h-7 w-auto" />
                        </div>
                        <span className="text-xs font-bold leading-tight">{m.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{m.badge}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Additional Supported Card Brands SVG */}
                <div className="pt-2 flex items-center justify-center gap-3 opacity-70">
                  <span className="text-[11px] text-gray-400">Qo‘llab-quvvatlanadi:</span>
                  <VisaIcon className="h-4 w-auto" />
                  <MastercardIcon className="h-4 w-auto" />
                  <HumoIcon className="h-4 w-auto" />
                  <UzcardIcon className="h-4 w-auto" />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => executePayment()}
                    className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide transition shadow-xl shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
                  >
                    <Lock size={16} />
                    <span>
                      {loading ? 'To‘lov amalga oshirilmoqda...' : `XAVFSIZ TO‘LOVNI BOSHLASH (${amountStr})`}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Order Summary (5 Cols) */}
            <div className="lg:col-span-5">
              <div
                className={`p-6 rounded-3xl border space-y-4 sticky top-10 ${
                  theme ? 'border-white/10 bg-surface' : 'border-gray-200 bg-white shadow-sm'
                }`}
              >
                <h3 className="text-sm font-bold font-[title] border-b border-inherit pb-3 text-primary">
                  Buyurtma Xulosasi
                </h3>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Tanlangan Tarif:</span>
                  <span className="font-bold font-[title] text-sm text-primary">{plan.name}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">To‘lov Davri:</span>
                  <span className="font-medium">{billingCycle === 'year' ? '1 Yillik (-20%)' : 'Oylik'}</span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-inherit text-[11px] text-gray-400">
                  <p>✓ Cheksiz mijozlar va avtomobillar bazasi</p>
                  <p>✓ SMS eslatmalar va Telegram bot</p>
                  <p>✓ 100% Multi-tenant xavfsizlik kafolati</p>
                  <p>✓ 256-bit SSL shifrlangan to‘lov</p>
                </div>

                <div className="pt-4 border-t border-inherit flex items-center justify-between font-bold">
                  <span className="text-xs uppercase tracking-wider font-[title]">Jami To‘lov:</span>
                  <span className="text-2xl font-mono text-emerald-400">{amountStr}</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-2">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                  <span>To‘lov tasdiqlangach, hisobingiz darhol faollashtiriladi.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card Input Modal */}
        <CardModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          method={METHODS.find((m) => m.id === selectedMethod)?.name || 'Uzcard'}
          amount={amountStr}
          onSubmit={handleCardSubmitSuccess}
        />
      </div>
    </div>
  );
}
