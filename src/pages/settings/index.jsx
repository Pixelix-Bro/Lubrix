import { Settings as SettingsIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { lubrixApi } from '../../services/api'

import SettingsNav from './SettingsNav'
import AccountTab from './tabs/AccountTab'
import AppearanceTab from './tabs/AppearanceTab'
import BillingTab from './tabs/BillingTab'
import CameraTab from './tabs/CameraTab'
import DataPrivacyTab from './tabs/DataPrivacyTab'
import GeneralTab from './tabs/GeneralTab'
import IntegrationsTab from './tabs/IntegrationsTab'
import InventoryTab from './tabs/InventoryTab'
import PrivacyPolicyTab from './tabs/PrivacyPolicyTab'

export default function Settings() {
  const authUser = useSelector((state) => state.auth?.user)
  const [searchParams, setSearchParams] = useSearchParams()
  const settingsTabs = [
    'general',
    'appearance',
    'account',
    'billing',
    'integrations',
    'camera',
    'inventory',
    'dataPrivacy',
    'privacy',
  ]
  const requestedTab = searchParams.get('tab')
  const activeTab = settingsTabs.includes(requestedTab) ? requestedTab : 'general'
  const selectTab = (tab) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('tab', tab)
    setSearchParams(nextParams, { replace: true })
  }

  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // 1. General Organization Data
  const [orgData, setOrgData] = useState({
    name: '',
    countryCode: 'UZ',
    timezone: 'Asia/Tashkent',
    currency: 'UZS',
    defaultLocale: 'uz',
    phone: '',
    email: '',
    address: '',
    settings: {
      lowStockThreshold: 10,
      workingDays: '',
      smsSender: '',
      smsProvider: 'eskiz',
      autoReminders: true,
    },
  })

  // 2. Billing & Payment Cards
  const [cards, setCards] = useState([])
  const [newCard, setNewCard] = useState({
    cardHolder: '',
    cardNumber: '',
    cardType: 'UZCARD',
    expiry: '',
    bankName: '',
    terminalId: '',
  })

  // 3. Camera / ANPR
  const [cameraSettings, setCameraSettings] = useState({
    cameraName: '',
    streamUrl: '',
    autoANPR: true,
    actionOnDetect: 'OPEN_SERVICE',
    minConfidence: 85,
  })

  // 4. Telegram Integration
  const [telegramData, setTelegramData] = useState({
    botToken: '',
    botUsername: '',
    isActive: false,
    ownerTelegramChatId: '',
    welcomeMessage: '',
    notifications: {
      serviceCompleted: true,
      lowStock: true,
      newCustomer: true,
      planExpiry: true,
    },
  })
  const [telegramCommands, setTelegramCommands] = useState([])
  const [telegramServices, setTelegramServices] = useState([])
  const [telegramBranches, setTelegramBranches] = useState([])
  const [tokenVerifying, setTokenVerifying] = useState(false)
  const [showToken, setShowToken] = useState(false)

  // 5. Categories, Audit, Billing
  const [categories, setCategories] = useState([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [billingTransactions, setBillingTransactions] = useState([])
  const [billingInvoices, setBillingInvoices] = useState([])
  const [auditLogs, setAuditLogs] = useState([])

  const loadAllSettings = useCallback(async () => {
    try {
      const requestLabels = [
        'tashkilot',
        'to‘lov kartalari',
        'kamera',
        'Telegram holati',
        'Telegram buyruqlari',
        'Telegram xizmatlari',
        'filiallar',
        'kategoriyalar',
        'to‘lovlar',
        'hisob-fakturalar',
        'audit loglari',
      ]
      const results = await Promise.allSettled([
        lubrixApi.getSettings(),
        lubrixApi.getPaymentCards(),
        lubrixApi.getCameraSettings(),
        lubrixApi.getTelegramStatus(),
        lubrixApi.getTelegramCommands(),
        lubrixApi.getTelegramServices(),
        lubrixApi.getBranches(),
        lubrixApi.getCategories(),
        lubrixApi.getTransactions(),
        lubrixApi.getInvoices(),
        lubrixApi.getAuditLogs(),
      ])
      const [
        settingsResult,
        cardsResult,
        cameraResult,
        telegramResult,
        commandsResult,
        servicesResult,
        branchesResult,
        categoriesResult,
        transactionsResult,
        invoicesResult,
        auditLogsResult,
      ] = results

      const settingsRes = settingsResult.status === 'fulfilled' ? settingsResult.value : null
      if (settingsRes?.data?.data?.organization) {
        setOrgData(settingsRes.data.data.organization)
      }
      if (cardsResult.status === 'fulfilled') setCards(cardsResult.value.data?.data || [])
      if (cameraResult.status === 'fulfilled' && cameraResult.value.data?.data?.[0]) {
        setCameraSettings(cameraResult.value.data.data[0])
      }
      if (telegramResult.status === 'fulfilled' && telegramResult.value.data?.data) {
        setTelegramData((prev) => ({ ...prev, ...telegramResult.value.data.data }))
      }
      if (commandsResult.status === 'fulfilled') {
        setTelegramCommands(commandsResult.value.data?.data || [])
      }
      if (servicesResult.status === 'fulfilled') {
        setTelegramServices(servicesResult.value.data?.data || [])
      }
      if (branchesResult.status === 'fulfilled') {
        setTelegramBranches(
          (branchesResult.value.data?.data || []).filter((branch) => branch.isActive !== false)
        )
      }
      if (categoriesResult.status === 'fulfilled') {
        setCategories(categoriesResult.value.data?.data || [])
      }
      if (transactionsResult.status === 'fulfilled') {
        setBillingTransactions(transactionsResult.value.data?.data || [])
      }
      if (invoicesResult.status === 'fulfilled') {
        setBillingInvoices(invoicesResult.value.data?.data || [])
      }
      if (auditLogsResult.status === 'fulfilled') {
        setAuditLogs(auditLogsResult.value.data?.data || [])
      }

      const failedRequests = results.flatMap((result, index) =>
        result.status === 'rejected' ? [requestLabels[index]] : []
      )
      if (failedRequests.length) {
        const message = `Yuklanmagan sozlamalar: ${failedRequests.join(', ')}`
        setErrorMsg(message)
        toast.error(message)
      } else {
        setErrorMsg('')
      }
    } catch (err) {
      console.error('Settings load error:', err)
      const message = err.response?.data?.error || 'Sozlamalarni yuklab bo‘lmadi'
      setErrorMsg(message)
      toast.error(message)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => loadAllSettings(), 0)
    return () => window.clearTimeout(timer)
  }, [loadAllSettings])

  // Handlers
  const handleSaveGeneral = async (e) => {
    if (e) e.preventDefault()
    try {
      setSaving(true)
      setErrorMsg('')
      await lubrixApi.updateSettings({
        organization: orgData,
        settings: orgData.settings,
      })
      setSavedSuccess(true)
      toast.success('Sozlamalar saqlandi')
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Xatolik yuz berdi'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleAddPaymentCard = async (e) => {
    e.preventDefault()
    if (authUser?.role !== 'OWNER') {
      toast.error('Faqat OWNER to‘lov kartasini qo‘sha oladi')
      return
    }
    try {
      setSaving(true)
      const res = await lubrixApi.addPaymentCard(newCard)
      setCards((prev) => [...prev, res.data?.data])
      setNewCard({
        cardHolder: '',
        cardNumber: '',
        cardType: 'UZCARD',
        expiry: '',
        bankName: '',
        terminalId: '',
      })
      toast.success('Karta qo‘shildi')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xatolik yuz berdi')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCard = async (id) => {
    if (!window.confirm('Kartani o‘chirmoqchimisiz?')) return
    try {
      await lubrixApi.deletePaymentCard(id)
      setCards((prev) => prev.filter((c) => (c._id || c.id) !== id))
      toast.success('Karta o‘chirildi')
    } catch {
      toast.error('O‘chirishda xatolik')
    }
  }

  const handleVerifyTelegram = async () => {
    if (!telegramData.botToken) {
      toast.error('Bot tokenini kiriting')
      return
    }
    try {
      setTokenVerifying(true)
      const res = await lubrixApi.verifyTelegramToken(telegramData.botToken)
      if (res.data?.success) {
        setTelegramData((prev) => ({
          ...prev,
          botUsername: res.data.data.username,
        }))
        toast.success(`Bot ulandi: @${res.data.data.username}`)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bot token noto‘g‘ri yoki xatolik yuz berdi')
    } finally {
      setTokenVerifying(false)
    }
  }

  const handleSaveTelegram = async () => {
    try {
      setSaving(true)
      await lubrixApi.saveTelegramIntegration(telegramData)
      await loadAllSettings()
      toast.success('Telegram sozlamalari saqlandi')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Telegramni saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnectTelegram = async () => {
    try {
      setSaving(true)
      await lubrixApi.disconnectTelegram()
      setTelegramData((prev) => ({ ...prev, isActive: false }))
      toast.success('Telegram bot uzildi')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Botni uzishda xatolik yuz berdi')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTelegramCommand = async (commandData) => {
    try {
      const response = await lubrixApi.saveTelegramCommand(commandData)
      const savedCommand = response.data?.data
      if (savedCommand) {
        setTelegramCommands((current) => {
          const exists = current.some(
            (item) => (item._id || item.id) === (savedCommand._id || savedCommand.id)
          )
          return exists
            ? current.map((item) =>
                (item._id || item.id) === (savedCommand._id || savedCommand.id)
                  ? savedCommand
                  : item
              )
            : [...current, savedCommand]
        })
      }
      toast.success('Bot komandasi saqlandi')
      return savedCommand
    } catch (err) {
      toast.error(err.response?.data?.error || 'Komandani saqlashda xatolik')
      return null
    }
  }

  const handleDeleteTelegramCommand = async (id) => {
    try {
      await lubrixApi.deleteTelegramCommand(id)
      setTelegramCommands((current) => current.filter((item) => (item._id || item.id) !== id))
      toast.success('Bot komandasi o‘chirildi')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Komandani o‘chirishda xatolik')
    }
  }

  const handleTestTelegramCommand = async (command) => {
    try {
      await lubrixApi.testTelegramCommand(command._id || command.id)
      toast.success(`${command.command} test xabari yuborildi`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Komanda testini yuborib bo‘lmadi')
    }
  }

  const handleUploadTelegramMedia = async (file, mediaType) => {
    try {
      const response = await lubrixApi.uploadTelegramMedia(file, mediaType)
      return response.data?.data || null
    } catch (err) {
      toast.error(err.response?.data?.error || 'Media yuklanmadi')
      return null
    }
  }

  const handleLoadTelegramMedia = async (reference) => {
    const id = String(reference || '').startsWith('media:') ? String(reference).slice(6) : ''
    if (!id) return null
    try {
      const response = await lubrixApi.getTelegramMedia(id)
      return response.data
    } catch (err) {
      toast.error(err.response?.data?.error || 'Saqlangan media ochilmadi')
      return null
    }
  }

  const handleSaveTelegramService = async (serviceData) => {
    try {
      const response = await lubrixApi.saveTelegramService(serviceData)
      const service = response.data?.data
      if (service) {
        setTelegramServices((current) => {
          const exists = current.some(
            (item) => (item._id || item.id) === (service._id || service.id)
          )
          return exists
            ? current.map((item) =>
                (item._id || item.id) === (service._id || service.id) ? service : item
              )
            : [...current, service]
        })
      }
      toast.success('Xizmat katalogga saqlandi')
      return service
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xizmatni saqlab bo‘lmadi')
      return null
    }
  }

  const handleDeleteTelegramService = async (id) => {
    try {
      await lubrixApi.deleteTelegramService(id)
      setTelegramServices((current) => current.filter((item) => (item._id || item.id) !== id))
      toast.success('Xizmat katalogdan o‘chirildi')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xizmatni o‘chirib bo‘lmadi')
    }
  }

  const handleSendTestMessage = async () => {
    try {
      await lubrixApi.sendTelegramTest(telegramData.ownerTelegramChatId)
      toast.success('Test xabari Telegramga yuborildi!')
    } catch (err) {
      toast.error(
        err.response?.data?.error || 'Test xabari yuborilmadi. Chat ID to‘g‘riligini tekshiring'
      )
    }
  }

  const handleSaveCamera = async () => {
    try {
      setSaving(true)
      await lubrixApi.saveCameraSetting(cameraSettings)
      toast.success('Kamera sozlamalari saqlandi')
    } catch {
      toast.error('Kamera sozlamalarini saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    try {
      const res = await lubrixApi.createCategory({ name: newCategoryName.trim() })
      setCategories((prev) => [...prev, res.data?.data])
      setNewCategoryName('')
      toast.success('Toifa qo‘shildi')
    } catch {
      toast.error('Toifani qo‘shishda xatolik')
    }
  }

  const handleDeleteCategory = async (id) => {
    try {
      await lubrixApi.deleteCategory(id)
      setCategories((prev) => prev.filter((c) => (c._id || c.id) !== id))
      toast.success('Toifa o‘chirildi')
    } catch {
      toast.error('Toifani o‘chirishda xatolik')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-brand tracking-wide flex items-center gap-2.5">
            <SettingsIcon className="text-primary" size={24} />
            <span>Tizim Sozlamalari</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Kompaniya profili, integratsiyalar, to‘lovlar va ombor parametrlari
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <SettingsNav activeTab={activeTab} setActiveTab={selectTab} />

        <div>
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
              onDisconnectTelegram={handleDisconnectTelegram}
              telegramCommands={telegramCommands}
              telegramServices={telegramServices}
              telegramBranches={telegramBranches}
              onSaveTelegramCommand={handleSaveTelegramCommand}
              onDeleteTelegramCommand={handleDeleteTelegramCommand}
              onTestTelegramCommand={handleTestTelegramCommand}
              onUploadTelegramMedia={handleUploadTelegramMedia}
              onLoadTelegramMedia={handleLoadTelegramMedia}
              onSaveTelegramService={handleSaveTelegramService}
              onDeleteTelegramService={handleDeleteTelegramService}
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

          {activeTab === 'privacy' && <PrivacyPolicyTab />}
        </div>
      </div>
    </div>
  )
}
