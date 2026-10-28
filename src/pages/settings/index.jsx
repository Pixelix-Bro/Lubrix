import { Settings as SettingsIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { lubrixApi } from '../../services/api';

import SettingsNav from './SettingsNav';
import GeneralTab from './tabs/GeneralTab';
import AppearanceTab from './tabs/AppearanceTab';
import AccountTab from './tabs/AccountTab';
import BillingTab from './tabs/BillingTab';
import IntegrationsTab from './tabs/IntegrationsTab';
import CameraTab from './tabs/CameraTab';
import InventoryTab from './tabs/InventoryTab';
import DataPrivacyTab from './tabs/DataPrivacyTab';
import HelpTab from './tabs/HelpTab';

export default function Settings() {
  const theme = useSelector((state) => state.themes.theme);
  const authUser = useSelector((state) => state.auth?.user);

  const [activeTab, setActiveTab] = useState('general');
  const [navSearch, setNavSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. General Organization Data
  const [orgData, setOrgData] = useState({
    name: 'Lubrix Avto Servis',
    countryCode: 'UZ',
    timezone: 'Asia/Tashkent',
    currency: 'UZS',
    defaultLocale: 'uz',
    phone: '+998712001122',
    email: 'info@lubrix.uz',
    address: 'Toshkent sh., Yunusobod tumani',
    settings: {
      lowStockThreshold: 10,
      workingDays: 'Dushanba - Shanba',
      smsSender: '4546',
      smsProvider: 'eskiz',
      autoReminders: true,
    },
  });

  // 2. Billing & Payment Cards
  const [cards, setCards] = useState([]);
  const [newCard, setNewCard] = useState({
    cardHolder: '',
    cardNumber: '',
    cardType: 'UZCARD',
    expiry: '',
    bankName: '',
    terminalId: '',
  });

  // 3. Camera / ANPR
  const [cameraSettings, setCameraSettings] = useState({
    cameraName: '1-Yo‘lak Kirish Kamerasi (ANPR)',
    streamUrl: 'rtsp://192.168.1.100:554/ch0',
    autoANPR: true,
    actionOnDetect: 'OPEN_SERVICE',
    minConfidence: 85,
  });

  // 4. Telegram Integration
  const [telegramData, setTelegramData] = useState({
    botToken: '',
    botUsername: '',
    isActive: false,
    ownerTelegramChatId: '',
    welcomeMessage: 'Assalomu alaykum! Lubrix xizmat botiga xush kelibsiz.',
    notifications: {
      newBooking: true,
      serviceCompleted: true,
      lowStock: true,
      dailyReport: true,
    },
  });
  const [tokenVerifying, setTokenVerifying] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // 5. Categories, Audit, Billing
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [billingTransactions, setBillingTransactions] = useState([]);
  const [billingInvoices, setBillingInvoices] = useState([]);

  const loadAllSettings = useCallback(async () => {
    try {
      const [settingsRes, cardsRes, camRes, tgRes, catRes, logsRes, txRes, invRes] = await Promise.all([
        lubrixApi.getSettings().catch(() => ({ data: {} })),
        lubrixApi.getPaymentCards().catch(() => ({ data: { data: [] } })),
        lubrixApi.getCameraSettings().catch(() => ({ data: { data: [] } })),
        lubrixApi.getTelegramStatus().catch(() => ({ data: { data: {} } })),
        lubrixApi.getCategories().catch(() => ({ data: { data: [] } })),
        lubrixApi.getAuditLogs().catch(() => ({ data: { data: [] } })),
        lubrixApi.getTransactions().catch(() => ({ data: { data: [] } })),
        lubrixApi.getInvoices().catch(() => ({ data: { data: [] } })),
      ]);

      if (settingsRes.data?.data?.organization) {
        setOrgData(settingsRes.data.data.organization);
      }
      setCards(cardsRes.data?.data || []);
      if (camRes.data?.data?.[0]) {
        setCameraSettings(camRes.data.data[0]);
      }
      if (tgRes.data?.data) {
        setTelegramData((prev) => ({ ...prev, ...(tgRes.data.data || {}) }));
      }
      setCategories(catRes.data?.data || []);
      setAuditLogs(logsRes.data?.data || []);
      setBillingTransactions(txRes.data?.data || []);
      setBillingInvoices(invRes.data?.data || []);
    } catch (err) {
      console.error('Settings load error:', err);
    }
  }, []);

  useEffect(() => {
    loadAllSettings();
  }, [loadAllSettings]);

  // Handlers
  const handleSaveGeneral = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      await lubrixApi.updateSettings({
        organization: orgData,
        settings: orgData.settings,
      });
      setSavedSuccess(true);
      toast.success('Sozlamalar saqlandi');
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Xatolik yuz berdi';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPaymentCard = async (e) => {
    e.preventDefault();
    if (authUser?.role !== 'OWNER') {
      toast.error('Faqat OWNER to‘lov kartasini qo‘sha oladi');
      return;
    }
    try {
      setSaving(true);
      const res = await lubrixApi.addPaymentCard(newCard);
      setCards((prev) => [...prev, res.data?.data]);
      setNewCard({
        cardHolder: '',
        cardNumber: '',
        cardType: 'UZCARD',
        expiry: '',
        bankName: '',
        terminalId: '',
      });
      toast.success('Karta qo‘shildi');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (id) => {
    if (!window.confirm('Kartani o‘chirmoqchimisiz?')) return;
    try {
      await lubrixApi.deletePaymentCard(id);
      setCards((prev) => prev.filter((c) => (c._id || c.id) !== id));
      toast.success('Karta o‘chirildi');
    } catch (err) {
      toast.error('O‘chirishda xatolik');
    }
  };

  const handleVerifyTelegram = async () => {
    if (!telegramData.botToken) {
      toast.error('Bot tokenini kiriting');
      return;
    }
    try {
      setTokenVerifying(true);
      const res = await lubrixApi.verifyTelegramToken(telegramData.botToken);
      if (res.data?.success) {
        setTelegramData((prev) => ({
          ...prev,
          botUsername: res.data.data.username,
          isActive: true,
        }));
        toast.success(`Bot ulandi: @${res.data.data.username}`);
      }
    } catch (err) {
      toast.error('Bot token noto‘g‘ri yoki xatolik yuz berdi');
    } finally {
      setTokenVerifying(false);
    }
  };

  const handleSaveTelegram = async () => {
    try {
      setSaving(true);
      await lubrixApi.saveTelegramIntegration(telegramData);
      toast.success('Telegram sozlamalari saqlandi');
    } catch (err) {
      toast.error('Telegramni saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    try {
      await lubrixApi.sendTelegramTest(telegramData.ownerTelegramChatId);
      toast.success('Test xabari Telegramga yuborildi!');
    } catch (err) {
      toast.error('Test xabari yuborilmadi. Chat ID to‘g‘riligini tekshiring');
    }
  };

  const handleSaveCamera = async () => {
    try {
      setSaving(true);
      await lubrixApi.saveCameraSetting(cameraSettings);
      toast.success('Kamera sozlamalari saqlandi');
    } catch (err) {
      toast.error('Kamera sozlamalarini saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await lubrixApi.createCategory({ name: newCategoryName.trim() });
      setCategories((prev) => [...prev, res.data?.data]);
      setNewCategoryName('');
      toast.success('Toifa qo‘shildi');
    } catch (err) {
      toast.error('Toifani qo‘shishda xatolik');
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await lubrixApi.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => (c._id || c.id) !== id));
      toast.success('Toifa o‘chirildi');
    } catch (err) {
      toast.error('Toifani o‘chirishda xatolik');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide flex items-center gap-2.5">
            <SettingsIcon className="text-primary" size={24} />
            <span>Tizim Sozlamalari</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Kompaniya profili, integratsiyalar, to‘lovlar va xavfsizlik audit parametrlari
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <SettingsNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            search={navSearch}
            setSearch={setNavSearch}
          />
        </div>

        <div className="md:col-span-3">
          {activeTab === 'general' && (
            <GeneralTab
              orgData={orgData}
              setOrgData={setOrgData}
              onSave={handleSaveGeneral}
              saving={saving}
              savedSuccess={savedSuccess}
              errorMsg={errorMsg}
            />
          )}

          {activeTab === 'appearance' && <AppearanceTab />}

          {activeTab === 'account' && <AccountTab />}

          {activeTab === 'billing' && (
            <BillingTab
              cards={cards}
              newCard={newCard}
              setNewCard={setNewCard}
              onAddCard={handleAddPaymentCard}
              onDeleteCard={handleDeleteCard}
              transactions={billingTransactions}
              invoices={billingInvoices}
              saving={saving}
              authUser={authUser}
            />
          )}

          {activeTab === 'integrations' && (
            <IntegrationsTab
              telegramData={telegramData}
              setTelegramData={setTelegramData}
              tokenVerifying={tokenVerifying}
              showToken={showToken}
              setShowToken={setShowToken}
              onVerifyTelegram={handleVerifyTelegram}
              onSaveTelegram={handleSaveTelegram}
              onSendTestMessage={handleSendTestMessage}
              saving={saving}
            />
          )}

          {activeTab === 'camera' && (
            <CameraTab
              cameraSettings={cameraSettings}
              setCameraSettings={setCameraSettings}
              onSave={handleSaveCamera}
              saving={saving}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryTab
              categories={categories}
              newCategoryName={newCategoryName}
              setNewCategoryName={setNewCategoryName}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              orgData={orgData}
              setOrgData={setOrgData}
            />
          )}

          {activeTab === 'dataPrivacy' && <DataPrivacyTab auditLogs={auditLogs} />}

          {activeTab === 'help' && <HelpTab />}
        </div>
      </div>
    </div>
  );
}
