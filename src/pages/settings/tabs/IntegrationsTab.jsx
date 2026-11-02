import {
  Bot,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useSelector } from 'react-redux'

const RESPONSE_TYPES = [
  'Reply Message',
  'Inline Message',
  'Photo Message',
  'Text Message',
  'Video Message',
  'Document Message',
  'Audio / Voice Message',
  'Contact / Location',
  'Multiple Messages',
  'All Features',
]

const BOT_ACTIONS = [
  ['command.template', 'Xabar yuborish'],
  ['menu.start', 'Asosiy menyu'],
  ['menu.help', 'Yordam'],
  ['search.menu', 'Avtomobil qidiruvi'],
  ['search.phone', 'Telefon bilan qidirish'],
  ['search.plate', 'Davlat raqami bilan qidirish'],
  ['branches.regions', 'Viloyat tanlash'],
  ['branches.list', 'Filiallarni ko‘rsatish'],
  ['branches.all', 'Filial lokatsiyalari'],
  ['branches.nearby', 'Yaqin filial'],
  ['branch.details', 'Filial ma’lumoti'],
  ['services.list', 'Xizmatlar'],
  ['products.list', 'Mahsulotlar'],
  ['customer.cars', 'Mening avtomobillarim'],
  ['customer.history', 'Xizmatlar tarixi'],
  ['contact', 'Operator bilan bog‘lanish'],
  ['contact.request', 'Murojaat yuborish'],
  ['booking.start', 'Tashrif so‘rovini boshlash'],
  ['booking.service', 'Tashrif xizmatini tanlash'],
  ['flow.back', 'Oldingi menyu'],
  ['flow.cancel', 'Jarayonni bekor qilish'],
]

const makeCommandForm = (command) => ({
  ...(command
    ? {
        id: command._id || command.id,
        command: command.command,
        title: command.title || '',
        description: command.description || '',
        responseTemplate: command.responseTemplate || '',
        responseType: command.responseType || 'Text Message',
        isActive: command.isActive !== false,
        configuration: structuredClone(command.configuration || {}),
      }
    : {
        command: '/',
        title: '',
        description: '',
        responseTemplate: '',
        responseType: 'Text Message',
        isActive: true,
        configuration: {},
      }),
})

const formatMessage = (value, format, parseMode = 'HTML') => {
  const text = value || (format === 'link' ? 'havola matni' : 'matn')
  const html = parseMode === 'HTML'
  const wrappers = html
    ? {
        bold: ['<b>', '</b>'],
        italic: ['<i>', '</i>'],
        underline: ['<u>', '</u>'],
        strike: ['<s>', '</s>'],
        code: ['<code>', '</code>'],
        link: ['<a href="https://">', '</a>'],
      }
    : {
        bold: ['*', '*'],
        italic: ['_', '_'],
        underline: ['__', '__'],
        strike: ['~', '~'],
        code: ['`', '`'],
        link: ['[', '](https://)'],
      }
  const [before, after] = wrappers[format]
  return `${before}${text}${after}`
}

/**
 * IntegrationsTab — Telegram Bot & Integratsiyalar
 */
export default function IntegrationsTab({
  telegramData,
  setTelegramData,
  tokenVerifying,
  showToken,
  setShowToken,
  onVerifyTelegram,
  onSaveTelegram,
  onSendTestMessage,
  onDisconnectTelegram,
  telegramCommands = [],
  telegramServices = [],
  telegramBranches = [],
  onSaveTelegramCommand,
  onDeleteTelegramCommand,
  onSaveTelegramService,
  onDeleteTelegramService,
  onTestTelegramCommand,
  onUploadTelegramMedia,
  onLoadTelegramMedia,
  saving,
}) {
  const theme = useSelector((s) => s.themes.theme)
  const [commandForm, setCommandForm] = useState(null)
  const [commandSaving, setCommandSaving] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [commandStatus, setCommandStatus] = useState('all')
  const [commandPage, setCommandPage] = useState(0)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [serviceForm, setServiceForm] = useState(null)
  const [serviceSaving, setServiceSaving] = useState(false)

  const inputCls = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition ${
    theme
      ? 'border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-primary/50'
      : 'border-gray-200 bg-white text-gray-900 focus:border-primary/50'
  }`

  const labelCls = `block text-xs font-semibold mb-1 ${theme ? 'text-gray-300' : 'text-gray-600'}`

  const startCommandEdit = (command = null) => setCommandForm(makeCommandForm(command))

  const startServiceEdit = (service = null) =>
    setServiceForm(
      service
        ? {
            id: service._id || service.id,
            name: service.name || '',
            description: service.description || '',
            price: service.price ?? '',
            currency: service.currency || 'UZS',
            durationMinutes: service.durationMinutes ?? '',
            branchIds: (service.branchIds || []).filter((id) =>
              telegramBranches.some((branch) => (branch._id || branch.id) === id)
            ),
            isActive: service.isActive !== false,
          }
        : {
            name: '',
            description: '',
            price: '',
            currency: 'UZS',
            durationMinutes: '',
            branchIds: [],
            isActive: true,
          }
    )

  const saveService = async (event) => {
    event.preventDefault()
    try {
      setServiceSaving(true)
      const saved = await onSaveTelegramService(serviceForm)
      if (saved) setServiceForm(null)
    } finally {
      setServiceSaving(false)
    }
  }

  const deleteService = (service) => {
    if (!window.confirm(`${service.name} xizmatini katalogdan o‘chirmoqchimisiz?`)) return
    onDeleteTelegramService(service._id || service.id)
  }

  const updateConfiguration = (update) =>
    setCommandForm((current) => ({
      ...current,
      configuration: { ...current.configuration, ...update },
    }))

  const updateMessage = (index, update) => {
    const messages = [...(commandForm.configuration.messages || [])]
    messages[index] = { ...messages[index], ...update }
    updateConfiguration({ messages })
  }

  const handleMediaUpload = async (file, mediaType, onUploaded) => {
    if (!file || !onUploadTelegramMedia) return
    try {
      setMediaUploading(true)
      const uploaded = await onUploadTelegramMedia(file, mediaType)
      if (!uploaded) return
      setMediaPreview((current) => {
        if (current?.url) URL.revokeObjectURL(current.url)
        return {
          url: URL.createObjectURL(file),
          type: mediaType,
          name: uploaded.fileName,
          reference: uploaded.media,
        }
      })
      onUploaded(uploaded.media)
    } finally {
      setMediaUploading(false)
    }
  }

  const previewStoredMedia = async (reference, mediaType) => {
    if (!reference || !onLoadTelegramMedia) return
    try {
      const blob = await onLoadTelegramMedia(reference)
      if (!blob) return
      setMediaPreview((current) => {
        if (current?.url) URL.revokeObjectURL(current.url)
        return {
          url: URL.createObjectURL(blob),
          type: mediaType,
          name: 'Saqlangan media',
          reference,
        }
      })
    } catch {
      return
    }
  }

  const formatMainMessage = (format) => {
    const parseMode = commandForm.configuration.parseMode || 'HTML'
    setCommandForm((current) => ({
      ...current,
      responseTemplate: formatMessage(current.responseTemplate, format, parseMode),
      configuration: { ...current.configuration, parseMode },
    }))
  }

  const formatStepMessage = (index, format) => {
    const message = commandForm.configuration.messages[index]
    const parseMode = message.parseMode || 'HTML'
    updateMessage(index, { text: formatMessage(message.text, format, parseMode), parseMode })
  }

  const updateKeyboardButton = (keyboardKey, rowIndex, buttonIndex, update) => {
    const rows = [...commandRows(keyboardKey)].map((row) => [...row])
    rows[rowIndex][buttonIndex] = { ...rows[rowIndex][buttonIndex], ...update }
    updateConfiguration({
      [keyboardKey]:
        keyboardKey === 'replyKeyboard'
          ? { ...(commandForm.configuration.replyKeyboard || {}), rows }
          : rows,
    })
  }

  const addKeyboardRow = (keyboardKey) => {
    const rows = [...commandRows(keyboardKey), []]
    updateConfiguration({
      [keyboardKey]:
        keyboardKey === 'replyKeyboard'
          ? { ...(commandForm.configuration.replyKeyboard || {}), rows }
          : rows,
    })
  }

  const addKeyboardButton = (keyboardKey, rowIndex) => {
    const rows = [...commandRows(keyboardKey)].map((row) => [...row])
    rows[rowIndex].push(
      keyboardKey === 'replyKeyboard'
        ? { text: '', action: 'menu.start' }
        : { text: '', type: 'callback', action: 'menu.start', payload: {} }
    )
    updateConfiguration({
      [keyboardKey]:
        keyboardKey === 'replyKeyboard'
          ? { ...(commandForm.configuration.replyKeyboard || {}), rows }
          : rows,
    })
  }

  const removeKeyboardButton = (keyboardKey, rowIndex, buttonIndex) => {
    const rows = [...commandRows(keyboardKey)].map((row) => [...row])
    rows[rowIndex].splice(buttonIndex, 1)
    const filteredRows = rows.filter((row) => row.length)
    updateConfiguration({
      [keyboardKey]:
        keyboardKey === 'replyKeyboard'
          ? { ...(commandForm.configuration.replyKeyboard || {}), rows: filteredRows }
          : filteredRows,
    })
  }

  const filteredCommands = telegramCommands.filter((command) => {
    const query = commandQuery.trim().toLowerCase()
    const matchesQuery =
      !query ||
      [command.command, command.title, command.description].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      )
    const matchesStatus =
      commandStatus === 'all' || (commandStatus === 'active' ? command.isActive : !command.isActive)
    return matchesQuery && matchesStatus
  })
  const pageSize = 8
  const pageCount = Math.max(1, Math.ceil(filteredCommands.length / pageSize))
  const visibleCommands = filteredCommands.slice(
    commandPage * pageSize,
    (commandPage + 1) * pageSize
  )

  const removeCommand = (command) => {
    const id = command._id || command.id
    if (!window.confirm(`${command.command} komandasini o‘chirmoqchimisiz?`)) return
    onDeleteTelegramCommand(id)
  }

  const duplicateCommand = (command) => {
    const duplicate = makeCommandForm(command)
    delete duplicate.id
    duplicate.command = `${command.command}_copy`.slice(0, 32)
    duplicate.title = `${command.title} (nusxa)`.slice(0, 80)
    setCommandForm(duplicate)
  }

  const commandRows = (key) =>
    key === 'replyKeyboard'
      ? commandForm.configuration.replyKeyboard?.rows || []
      : commandForm.configuration.inlineKeyboard || []

  const moveKeyboardRow = (keyboardKey, rowIndex, delta) => {
    const rows = [...commandRows(keyboardKey)]
    const targetIndex = rowIndex + delta
    if (targetIndex < 0 || targetIndex >= rows.length) return
    ;[rows[rowIndex], rows[targetIndex]] = [rows[targetIndex], rows[rowIndex]]
    updateConfiguration({
      [keyboardKey]:
        keyboardKey === 'replyKeyboard'
          ? { ...(commandForm.configuration.replyKeyboard || {}), rows }
          : rows,
    })
  }

  const moveKeyboardButton = (keyboardKey, rowIndex, buttonIndex, delta) => {
    const rows = commandRows(keyboardKey).map((row) => [...row])
    const targetIndex = buttonIndex + delta
    if (targetIndex < 0 || targetIndex >= rows[rowIndex].length) return
    ;[rows[rowIndex][buttonIndex], rows[rowIndex][targetIndex]] = [
      rows[rowIndex][targetIndex],
      rows[rowIndex][buttonIndex],
    ]
    updateConfiguration({
      [keyboardKey]:
        keyboardKey === 'replyKeyboard'
          ? { ...(commandForm.configuration.replyKeyboard || {}), rows }
          : rows,
    })
  }

  const renderKeyboardEditor = (keyboardKey, title, inline = false) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-xs font-semibold">{title}</h5>
        <button
          type="button"
          onClick={() => addKeyboardRow(keyboardKey)}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs hover:border-sky-500"
        >
          Qator qo‘shish
        </button>
      </div>
      {commandRows(keyboardKey).map((row, rowIndex) => (
        <div
          key={`${keyboardKey}-${rowIndex}`}
          className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-white/10"
        >
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>{rowIndex + 1}-qator</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!rowIndex}
                onClick={() => moveKeyboardRow(keyboardKey, rowIndex, -1)}
                className="disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={rowIndex === commandRows(keyboardKey).length - 1}
                onClick={() => moveKeyboardRow(keyboardKey, rowIndex, 1)}
                className="disabled:opacity-40"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => {
                  const rows = commandRows(keyboardKey).filter((_, index) => index !== rowIndex)
                  updateConfiguration({
                    [keyboardKey]:
                      keyboardKey === 'replyKeyboard'
                        ? { ...(commandForm.configuration.replyKeyboard || {}), rows }
                        : rows,
                  })
                }}
                className="text-rose-500"
              >
                Qatorni o‘chirish
              </button>
            </div>
          </div>
          {row.map((button, buttonIndex) => (
            <div
              key={`${rowIndex}-${buttonIndex}`}
              className="grid gap-2 sm:grid-cols-[1fr_150px_1fr_auto]"
            >
              <input
                maxLength={64}
                value={button.text || ''}
                onChange={(event) =>
                  updateKeyboardButton(keyboardKey, rowIndex, buttonIndex, {
                    text: event.target.value,
                  })
                }
                placeholder="Tugma matni"
                className={inputCls}
              />
              {inline ? (
                <select
                  value={button.type || 'callback'}
                  onChange={(event) =>
                    updateKeyboardButton(keyboardKey, rowIndex, buttonIndex, {
                      type: event.target.value,
                    })
                  }
                  className={inputCls}
                >
                  <option value="callback">Callback action</option>
                  <option value="url">HTTPS havola</option>
                  <option value="web_app">Web App</option>
                </select>
              ) : (
                <select
                  value={
                    button.requestContact ? 'contact' : button.requestLocation ? 'location' : 'text'
                  }
                  onChange={(event) =>
                    updateKeyboardButton(keyboardKey, rowIndex, buttonIndex, {
                      requestContact: event.target.value === 'contact',
                      requestLocation: event.target.value === 'location',
                    })
                  }
                  className={inputCls}
                >
                  <option value="text">Matn/action</option>
                  <option value="contact">Kontakt so‘rash</option>
                  <option value="location">Lokatsiya so‘rash</option>
                </select>
              )}
              {inline && button.type !== 'url' && button.type !== 'web_app' ? (
                <select
                  value={button.action || 'menu.start'}
                  onChange={(event) =>
                    updateKeyboardButton(keyboardKey, rowIndex, buttonIndex, {
                      action: event.target.value,
                    })
                  }
                  className={inputCls}
                >
                  {BOT_ACTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : inline ? (
                <input
                  type="url"
                  value={button.url || ''}
                  onChange={(event) =>
                    updateKeyboardButton(keyboardKey, rowIndex, buttonIndex, {
                      url: event.target.value,
                    })
                  }
                  placeholder="https://..."
                  className={inputCls}
                />
              ) : (
                <select
                  value={button.action || 'menu.start'}
                  disabled={button.requestContact || button.requestLocation}
                  onChange={(event) =>
                    updateKeyboardButton(keyboardKey, rowIndex, buttonIndex, {
                      action: event.target.value,
                    })
                  }
                  className={inputCls}
                >
                  {BOT_ACTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
              {(!inline || (button.type !== 'url' && button.type !== 'web_app')) &&
                button.action === 'command.template' && (
                  <input
                    value={button.payload?.text || ''}
                    onChange={(event) =>
                      updateKeyboardButton(keyboardKey, rowIndex, buttonIndex, {
                        payload: { ...(button.payload || {}), text: event.target.value },
                      })
                    }
                    placeholder="Tugma bosilgandagi xabar"
                    className={`${inputCls} sm:col-span-3`}
                  />
                )}
              <label className="flex items-center justify-center gap-1 text-[10px] text-gray-500">
                <input
                  type="checkbox"
                  checked={button.isActive !== false}
                  onChange={(event) =>
                    updateKeyboardButton(keyboardKey, rowIndex, buttonIndex, {
                      isActive: event.target.checked,
                    })
                  }
                />
                Faol
              </label>
              <button
                type="button"
                disabled={!buttonIndex}
                onClick={() => moveKeyboardButton(keyboardKey, rowIndex, buttonIndex, -1)}
                aria-label="Tugmani chapga ko‘chirish"
                className="rounded-lg p-2 text-gray-500 disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={buttonIndex === row.length - 1}
                onClick={() => moveKeyboardButton(keyboardKey, rowIndex, buttonIndex, 1)}
                aria-label="Tugmani o‘ngga ko‘chirish"
                className="rounded-lg p-2 text-gray-500 disabled:opacity-40"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeKeyboardButton(keyboardKey, rowIndex, buttonIndex)}
                aria-label="Tugmani o‘chirish"
                className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addKeyboardButton(keyboardKey, rowIndex)}
            className="text-xs font-medium text-sky-600"
          >
            + Tugma qo‘shish
          </button>
        </div>
      ))}
      {inline ? null : (
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          {[
            ['resizeKeyboard', 'O‘lchamni moslash'],
            ['oneTimeKeyboard', 'Bir martalik'],
            ['isPersistent', 'Doim ko‘rsatish'],
            ['selective', 'Tanlangan foydalanuvchi'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={Boolean(commandForm.configuration.replyKeyboard?.[key])}
                onChange={(event) =>
                  updateConfiguration({
                    replyKeyboard: {
                      ...(commandForm.configuration.replyKeyboard || {}),
                      [key]: event.target.checked,
                    },
                  })
                }
              />
              {label}
            </label>
          ))}
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={Boolean(commandForm.configuration.replyKeyboard?.hide)}
              onChange={(event) =>
                updateConfiguration({
                  replyKeyboard: {
                    ...(commandForm.configuration.replyKeyboard || {}),
                    hide: event.target.checked,
                  },
                })
              }
            />
            Klaviaturani yashirish
          </label>
        </div>
      )}
    </div>
  )

  const submitCommand = async (event) => {
    event.preventDefault()
    try {
      setCommandSaving(true)
      const saved = await onSaveTelegramCommand(commandForm)
      if (saved) setCommandForm(null)
    } finally {
      setCommandSaving(false)
    }
  }

  const testCommandDraft = async () => {
    if (!onTestTelegramCommand) return
    try {
      setCommandSaving(true)
      const saved = await onSaveTelegramCommand(commandForm)
      if (saved) await onTestTelegramCommand(saved)
    } finally {
      setCommandSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div
        className={`p-5 rounded-2xl border ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'}`}
      >
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
              <Bot size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold font-[title]">Telegram Bot Integratsiyasi</h3>
              <p className="text-xs text-gray-400">
                Navbatlar, yangi mijozlar va xizmat hisobotlarini bot orqali qabul qilish
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                telegramData.isActive
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
              }`}
            >
              {telegramData.isActive ? 'Faol' : 'Nofaol'}
            </span>
          </div>
        </div>

        <div
          className={`mb-4 rounded-xl border px-3 py-2 text-xs ${
            telegramData.isActive
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-sky-500/20 bg-sky-500/10 text-sky-300'
          }`}
        >
          {telegramData.isActive
            ? 'Telegram xizmatlari tayyor holatda ishlayapti. Xabarlar bot orqali avtomatik yuboriladi.'
            : 'Telegram xizmatlarini faollashtirish uchun bot tokeni va admin chat ID ni kiritib, “Tekshirish” tugmasini bosing.'}
        </div>
        {telegramData.lastError && (
          <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
            Bot xatosi: {telegramData.lastError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Bot Token (@BotFather dan olingan)</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={telegramData.botToken || ''}
                onChange={(e) => setTelegramData((p) => ({ ...p, botToken: e.target.value }))}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className={`${inputCls} pr-24`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  type="button"
                  onClick={onVerifyTelegram}
                  disabled={tokenVerifying || !telegramData.botToken}
                  className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {tokenVerifying ? <Loader2 size={13} className="animate-spin" /> : 'Tekshirish'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Bot Foydalanuvchi Nomi (Username)</label>
              <input
                type="text"
                readOnly
                value={telegramData.botUsername ? `@${telegramData.botUsername}` : '—'}
                className={`${inputCls} opacity-80 cursor-not-allowed`}
              />
            </div>
            <div>
              <label className={labelCls}>Admin Chat ID (Xabarlar keladigan Telegram ID)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={telegramData.ownerTelegramChatId || ''}
                  onChange={(e) =>
                    setTelegramData((p) => ({ ...p, ownerTelegramChatId: e.target.value }))
                  }
                  placeholder="987654321"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={onSendTestMessage}
                  disabled={!telegramData.ownerTelegramChatId}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send size={14} /> Test
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Bosh menyu tugmasi matni</label>
            <textarea
              rows={2}
              value={telegramData.welcomeMessage || ''}
              onChange={(e) => setTelegramData((p) => ({ ...p, welcomeMessage: e.target.value }))}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Telegram /start komandasi matni “Bot komandalar” bo‘limidagi /start sozlamasidan
              olinadi.
            </p>
            <label className={`${labelCls} mt-3`}>Telegram /start rasmi</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                handleMediaUpload(event.target.files?.[0], 'photo', (media) =>
                  setTelegramData((current) => ({ ...current, welcomeMediaId: media }))
                )
              }
              className={inputCls}
            />
            {telegramData.welcomeMediaId && (
              <p className="mt-1 text-[11px] text-emerald-600">
                Welcome rasmi bot uchun xavfsiz saqlandi.
              </p>
            )}
            {telegramData.welcomeMediaId && (
              <button
                type="button"
                onClick={() => previewStoredMedia(telegramData.welcomeMediaId, 'photo')}
                className="mr-3 mt-1 text-xs text-sky-600"
              >
                Preview
              </button>
            )}
            {telegramData.welcomeMediaId && (
              <button
                type="button"
                onClick={() => setTelegramData((current) => ({ ...current, welcomeMediaId: '' }))}
                className="mt-1 text-xs text-rose-500"
              >
                Welcome rasmni olib tashlash
              </button>
            )}
            {mediaPreview?.type === 'photo' &&
              mediaPreview.reference === telegramData.welcomeMediaId && (
                <img
                  src={mediaPreview.url}
                  alt={mediaPreview.name || 'Welcome rasmi'}
                  className="mt-2 max-h-36 rounded-lg object-contain"
                />
              )}
          </div>

          {/* Bildirishnomalar turi */}
          <div>
            <label className={labelCls}>Yuboriladigan Xabarnomalar</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2">
              {[
                { key: 'serviceCompleted', label: 'Xizmat tugallanganda' },
                { key: 'lowStock', label: 'Moy zaxirasi kam qolganda' },
                { key: 'newCustomer', label: 'Yangi mijoz qo‘shilganda' },
                { key: 'planExpiry', label: 'Obuna tugashiga yaqin' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition ${
                    telegramData.notifications?.[key]
                      ? 'border-sky-500/40 bg-sky-500/10 text-sky-400 font-medium'
                      : theme
                        ? 'border-white/5 bg-white/5 text-gray-400'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!telegramData.notifications?.[key]}
                    onChange={(e) =>
                      setTelegramData((p) => ({
                        ...p,
                        notifications: { ...p.notifications, [key]: e.target.checked },
                      }))
                    }
                    className="rounded text-sky-500 focus:ring-0"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onSaveTelegram}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Telegram Sozlamalarini Saqlash
          </button>
          {telegramData.isActive && (
            <button
              type="button"
              onClick={onDisconnectTelegram}
              disabled={saving}
              className="ml-2 rounded-xl border border-rose-500/30 px-4 py-2.5 text-sm font-semibold text-rose-500 transition hover:bg-rose-500/10 disabled:opacity-50"
            >
              Botni uzish
            </button>
          )}
        </div>
      </div>

      <section
        className={`rounded-2xl border p-5 ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'}`}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold font-[title]">Telegram xizmatlar katalogi</h3>
            <p className="mt-1 text-xs text-gray-500">
              Bot faqat shu yerda faol deb belgilangan xizmatlarni ko‘rsatadi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => startServiceEdit()}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600"
          >
            <Plus size={16} /> Xizmat qo‘shish
          </button>
        </div>

        {serviceForm && (
          <form
            onSubmit={saveService}
            className="mb-4 space-y-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                {serviceForm.id ? 'Xizmatni tahrirlash' : 'Yangi xizmat'}
              </h4>
              <button
                type="button"
                onClick={() => setServiceForm(null)}
                aria-label="Yopish"
                className="rounded-lg p-1.5 text-gray-500 hover:bg-black/5"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>
                Xizmat nomi
                <input
                  required
                  maxLength={100}
                  value={serviceForm.name}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className={labelCls}>
                Tavsif
                <input
                  maxLength={500}
                  value={serviceForm.description}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className={labelCls}>
                Narx (bo‘sh qoldirish mumkin)
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={serviceForm.price}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, price: event.target.value }))
                  }
                  className={`${inputCls} mt-1`}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelCls}>
                  Valyuta
                  <input
                    maxLength={8}
                    value={serviceForm.currency}
                    onChange={(event) =>
                      setServiceForm((current) => ({
                        ...current,
                        currency: event.target.value.toUpperCase(),
                      }))
                    }
                    className={`${inputCls} mt-1`}
                  />
                </label>
                <label className={labelCls}>
                  Davomiylik, daqiqa
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    value={serviceForm.durationMinutes}
                    onChange={(event) =>
                      setServiceForm((current) => ({
                        ...current,
                        durationMinutes: event.target.value,
                      }))
                    }
                    className={`${inputCls} mt-1`}
                  />
                </label>
              </div>
            </div>
            <fieldset>
              <legend className={labelCls}>
                Xizmat mavjud bo‘lgan filiallar (bo‘sh bo‘lsa barcha faol filiallar)
              </legend>
              {telegramBranches.length ? (
                <div className="grid max-h-32 gap-2 overflow-auto sm:grid-cols-2">
                  {telegramBranches.map((branch) => {
                    const branchId = branch._id || branch.id
                    return (
                      <label
                        key={branchId}
                        className="flex items-center gap-2 text-xs text-gray-600"
                      >
                        <input
                          type="checkbox"
                          checked={serviceForm.branchIds.includes(branchId)}
                          onChange={(event) =>
                            setServiceForm((current) => ({
                              ...current,
                              branchIds: event.target.checked
                                ? [...current.branchIds, branchId]
                                : current.branchIds.filter((id) => id !== branchId),
                            }))
                          }
                        />
                        {branch.name} · {branch.region || branch.district || branch.address}
                      </label>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Faol filial topilmadi.</p>
              )}
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={serviceForm.isActive}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                Xizmat faol
              </label>
              <button
                type="submit"
                disabled={serviceSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {serviceSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                Saqlash
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-gray-200 dark:divide-white/10">
          {telegramServices.map((service) => (
            <div
              key={service._id || service.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{service.name}</span>
                  <span
                    className={`text-[10px] ${service.isActive ? 'text-emerald-500' : 'text-gray-500'}`}
                  >
                    {service.isActive ? 'Faol' : 'Nofaol'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {service.description || 'Tavsif yo‘q'} ·{' '}
                  {service.price === undefined || service.price === null
                    ? 'Narx belgilanmagan'
                    : `${Number(service.price).toLocaleString('uz-UZ')} ${service.currency || 'UZS'}`}{' '}
                  ·{' '}
                  {service.durationMinutes
                    ? `${service.durationMinutes} daqiqa`
                    : 'Davomiylik belgilanmagan'}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => startServiceEdit(service)}
                  aria-label={`${service.name} xizmatini tahrirlash`}
                  className="rounded-lg p-2 text-gray-500 hover:bg-sky-500/10 hover:text-sky-500"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteService(service)}
                  aria-label={`${service.name} xizmatini o‘chirish`}
                  className="rounded-lg p-2 text-gray-500 hover:bg-rose-500/10 hover:text-rose-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {!telegramServices.length && !serviceForm && (
            <p className="py-5 text-center text-sm text-gray-500">Xizmat katalogi bo‘sh.</p>
          )}
        </div>
      </section>

      <section
        className={`rounded-2xl border p-5 ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'}`}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold font-[title]">Bot komandalar</h3>
            <p className="mt-1 text-xs text-gray-500">
              Matn javoblarini sozlang va aktiv buyruqlarni bot menyusiga yuboring.
            </p>
          </div>
          <button
            type="button"
            onClick={() => startCommandEdit()}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
          >
            <Plus size={16} /> Yangi komanda
          </button>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px]">
          <label className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={commandQuery}
              onChange={(event) => {
                setCommandQuery(event.target.value)
                setCommandPage(0)
              }}
              placeholder="Komandalarni qidirish"
              className={`${inputCls} pl-9`}
            />
          </label>
          <select
            value={commandStatus}
            onChange={(event) => {
              setCommandStatus(event.target.value)
              setCommandPage(0)
            }}
            className={inputCls}
          >
            <option value="all">Barcha holatlar</option>
            <option value="active">Faol</option>
            <option value="inactive">Nofaol</option>
          </select>
        </div>

        {commandForm && (
          <form
            onSubmit={submitCommand}
            className="mb-5 grid gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold">
                {commandForm.id ? 'Komandani tahrirlash' : 'Yangi komanda'}
              </h4>
              <button
                type="button"
                onClick={() => setCommandForm(null)}
                aria-label="Yopish"
                className="rounded-lg p-1.5 text-gray-500 hover:bg-black/5"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Buyruq</label>
                <input
                  required
                  maxLength={32}
                  pattern="/[a-zA-Z0-9_]{1,31}"
                  value={commandForm.command}
                  onChange={(e) => setCommandForm((p) => ({ ...p, command: e.target.value }))}
                  placeholder="/services"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Nomi</label>
                <input
                  required
                  maxLength={80}
                  value={commandForm.title}
                  onChange={(e) => setCommandForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Xizmatlar"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Javob turi</label>
                <select
                  value={commandForm.responseType}
                  onChange={(event) => {
                    const responseType = event.target.value
                    setCommandForm((current) => ({
                      ...current,
                      responseType,
                      configuration:
                        ['Multiple Messages', 'All Features'].includes(responseType) &&
                        !current.configuration.messages?.length
                          ? {
                              ...current.configuration,
                              messages: [{ type: 'Text Message', text: current.responseTemplate }],
                            }
                          : current.configuration,
                    }))
                  }}
                  className={inputCls}
                >
                  {RESPONSE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Komanda actioni</label>
                <select
                  value={commandForm.configuration.action || 'command.template'}
                  onChange={(event) => updateConfiguration({ action: event.target.value })}
                  className={inputCls}
                >
                  {BOT_ACTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Tavsif</label>
              <input
                maxLength={256}
                value={commandForm.description}
                onChange={(e) => setCommandForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Xizmatlar haqida ma’lumot"
                className={inputCls}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>
                Matn formati
                <select
                  value={commandForm.configuration.parseMode || 'HTML'}
                  onChange={(event) => updateConfiguration({ parseMode: event.target.value })}
                  className={`${inputCls} mt-1`}
                >
                  <option value="HTML">HTML</option>
                  <option value="MarkdownV2">MarkdownV2</option>
                  <option value="">Oddiy matn</option>
                </select>
              </label>
              <div className="flex items-end text-[11px] text-gray-500">
                {'{{first_name}}'} {'{{last_name}}'} {'{{full_name}}'} {'{{username}}'}{' '}
                {'{{phone}}'} {'{{business_name}}'} {'{{branch_name}}'} {'{{vehicle_plate}}'}{' '}
                {'{{service_name}}'} {'{{next_service_date}}'}
              </div>
            </div>
            {['Multiple Messages', 'All Features'].includes(commandForm.responseType) ? (
              <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-semibold">Xabar qadamlari</h5>
                  <button
                    type="button"
                    onClick={() =>
                      updateConfiguration({
                        messages: [
                          ...(commandForm.configuration.messages || []),
                          { type: 'Text Message', text: '' },
                        ],
                      })
                    }
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs hover:border-sky-500"
                  >
                    + Xabar qo‘shish
                  </button>
                </div>
                {(commandForm.configuration.messages || []).map((message, index) => (
                  <div
                    key={`message-${index}`}
                    className="space-y-2 border-t border-gray-200 pt-3 dark:border-white/10"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{index + 1}-xabar</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!index}
                          onClick={() => {
                            const messages = [...commandForm.configuration.messages]
                            ;[messages[index - 1], messages[index]] = [
                              messages[index],
                              messages[index - 1],
                            ]
                            updateConfiguration({ messages })
                          }}
                          className="text-sky-600 disabled:opacity-40"
                        >
                          Yuqoriga
                        </button>
                        <button
                          type="button"
                          disabled={index === commandForm.configuration.messages.length - 1}
                          onClick={() => {
                            const messages = [...commandForm.configuration.messages]
                            ;[messages[index + 1], messages[index]] = [
                              messages[index],
                              messages[index + 1],
                            ]
                            updateConfiguration({ messages })
                          }}
                          className="text-sky-600 disabled:opacity-40"
                        >
                          Pastga
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateConfiguration({
                              messages: commandForm.configuration.messages.filter(
                                (_, itemIndex) => itemIndex !== index
                              ),
                            })
                          }
                          className="text-rose-500"
                        >
                          O‘chirish
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={message.type || 'Text Message'}
                        onChange={(event) => updateMessage(index, { type: event.target.value })}
                        className={inputCls}
                      >
                        {RESPONSE_TYPES.filter(
                          (type) => !['Multiple Messages', 'All Features'].includes(type)
                        ).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <select
                        value={message.parseMode || ''}
                        onChange={(event) =>
                          updateMessage(index, { parseMode: event.target.value })
                        }
                        className={inputCls}
                      >
                        <option value="">Oddiy matn</option>
                        <option value="HTML">HTML</option>
                        <option value="MarkdownV2">MarkdownV2</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        ['bold', 'B'],
                        ['italic', 'I'],
                        ['underline', 'U'],
                        ['strike', 'S'],
                        ['code', '<>'],
                        ['link', 'Link'],
                      ].map(([format, label]) => (
                        <button
                          key={format}
                          type="button"
                          onClick={() => formatStepMessage(index, format)}
                          className="rounded border border-gray-200 px-2 py-1 text-[11px] font-semibold hover:border-sky-500"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={3}
                      maxLength={4096}
                      value={message.text || ''}
                      onChange={(event) => updateMessage(index, { text: event.target.value })}
                      placeholder="Xabar matni"
                      className={inputCls}
                    />
                    {message.type === 'Audio / Voice Message' && (
                      <select
                        value={message.mediaType || 'audio'}
                        onChange={(event) =>
                          updateMessage(index, { mediaType: event.target.value })
                        }
                        className={inputCls}
                      >
                        <option value="audio">Audio</option>
                        <option value="voice">Voice</option>
                      </select>
                    )}
                    {message.type === 'Contact / Location' && (
                      <div className="space-y-2">
                        <select
                          value={message.contactLocationType || 'contact'}
                          onChange={(event) =>
                            updateMessage(index, { contactLocationType: event.target.value })
                          }
                          className={inputCls}
                        >
                          <option value="contact">Kontakt</option>
                          <option value="location">Lokatsiya</option>
                        </select>
                        {message.contactLocationType === 'location' ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              type="number"
                              min="-90"
                              max="90"
                              step="any"
                              value={message.latitude ?? ''}
                              onChange={(event) =>
                                updateMessage(index, { latitude: event.target.value })
                              }
                              placeholder="Latitude"
                              className={inputCls}
                            />
                            <input
                              type="number"
                              min="-180"
                              max="180"
                              step="any"
                              value={message.longitude ?? ''}
                              onChange={(event) =>
                                updateMessage(index, { longitude: event.target.value })
                              }
                              placeholder="Longitude"
                              className={inputCls}
                            />
                          </div>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              value={message.contactPhone || ''}
                              onChange={(event) =>
                                updateMessage(index, { contactPhone: event.target.value })
                              }
                              placeholder="Telefon raqami"
                              className={inputCls}
                            />
                            <input
                              value={message.contactName || ''}
                              onChange={(event) =>
                                updateMessage(index, { contactName: event.target.value })
                              }
                              placeholder="Kontakt nomi"
                              className={inputCls}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {[
                      'Photo Message',
                      'Video Message',
                      'Document Message',
                      'Audio / Voice Message',
                    ].includes(message.type) && (
                      <input
                        type="file"
                        disabled={mediaUploading}
                        accept={
                          message.type === 'Photo Message'
                            ? 'image/jpeg,image/png,image/webp'
                            : message.type === 'Video Message'
                              ? 'video/mp4'
                              : message.type === 'Document Message'
                                ? 'application/pdf,text/plain'
                                : message.mediaType === 'voice'
                                  ? 'audio/ogg'
                                  : 'audio/mpeg,audio/mp4,audio/ogg,audio/wav'
                        }
                        onChange={(event) =>
                          handleMediaUpload(
                            event.target.files?.[0],
                            message.type === 'Photo Message'
                              ? 'photo'
                              : message.type === 'Video Message'
                                ? 'video'
                                : message.type === 'Document Message'
                                  ? 'document'
                                  : message.mediaType || 'audio',
                            (media) => updateMessage(index, { media })
                          )
                        }
                        className={inputCls}
                      />
                    )}
                    {mediaUploading && (
                      <span className="text-[11px] text-sky-600">Media yuklanmoqda…</span>
                    )}
                    {message.media && (
                      <div className="flex gap-3 text-[11px]">
                        <button
                          type="button"
                          onClick={() =>
                            previewStoredMedia(
                              message.media,
                              message.type === 'Photo Message'
                                ? 'photo'
                                : message.type === 'Video Message'
                                  ? 'video'
                                  : 'document'
                            )
                          }
                          className="text-sky-600"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => updateMessage(index, { media: '' })}
                          className="text-rose-500"
                        >
                          Media olib tashlash
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : commandForm.responseType === 'Contact / Location' ? (
              <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-white/10">
                <label className={labelCls}>
                  Yuboriladigan ma’lumot
                  <select
                    value={commandForm.configuration.contactLocationType || 'contact'}
                    onChange={(event) =>
                      updateConfiguration({ contactLocationType: event.target.value })
                    }
                    className={`${inputCls} mt-1`}
                  >
                    <option value="contact">Kontakt</option>
                    <option value="location">Lokatsiya</option>
                  </select>
                </label>
                {commandForm.configuration.contactLocationType === 'location' ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      min="-90"
                      max="90"
                      step="any"
                      value={commandForm.configuration.latitude ?? ''}
                      onChange={(event) => updateConfiguration({ latitude: event.target.value })}
                      placeholder="Latitude"
                      className={inputCls}
                    />
                    <input
                      type="number"
                      min="-180"
                      max="180"
                      step="any"
                      value={commandForm.configuration.longitude ?? ''}
                      onChange={(event) => updateConfiguration({ longitude: event.target.value })}
                      placeholder="Longitude"
                      className={inputCls}
                    />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={commandForm.configuration.contactPhone || ''}
                      onChange={(event) =>
                        updateConfiguration({ contactPhone: event.target.value })
                      }
                      placeholder="Telefon raqami"
                      className={inputCls}
                    />
                    <input
                      value={commandForm.configuration.contactName || ''}
                      onChange={(event) => updateConfiguration({ contactName: event.target.value })}
                      placeholder="Kontakt nomi"
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className={labelCls}>Xabar matni</label>
                <div className="mb-1 flex flex-wrap gap-1">
                  {[
                    ['bold', 'B'],
                    ['italic', 'I'],
                    ['underline', 'U'],
                    ['strike', 'S'],
                    ['code', '<>'],
                    ['link', 'Link'],
                  ].map(([format, label]) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => formatMainMessage(format)}
                      className="rounded border border-gray-200 px-2 py-1 text-[11px] font-semibold hover:border-sky-500"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  required={['Reply Message', 'Inline Message', 'Text Message'].includes(
                    commandForm.responseType
                  )}
                  rows={5}
                  maxLength={4096}
                  value={commandForm.responseTemplate}
                  onChange={(event) =>
                    setCommandForm((current) => ({
                      ...current,
                      responseTemplate: event.target.value,
                    }))
                  }
                  placeholder="{{business_name}}\n\n{{first_name}}"
                  className={inputCls}
                />
                <div className="mt-1 flex justify-end text-[11px] text-gray-500">
                  {commandForm.responseTemplate.length}/4096
                </div>
                {[
                  'Photo Message',
                  'Video Message',
                  'Document Message',
                  'Audio / Voice Message',
                ].includes(commandForm.responseType) && (
                  <div className="mt-2 space-y-2">
                    {commandForm.responseType === 'Audio / Voice Message' && (
                      <select
                        value={commandForm.configuration.mediaType || 'audio'}
                        onChange={(event) => updateConfiguration({ mediaType: event.target.value })}
                        className={inputCls}
                      >
                        <option value="audio">Audio</option>
                        <option value="voice">Voice</option>
                      </select>
                    )}
                    <input
                      type="file"
                      disabled={mediaUploading}
                      accept={
                        commandForm.responseType === 'Photo Message'
                          ? 'image/jpeg,image/png,image/webp'
                          : commandForm.responseType === 'Video Message'
                            ? 'video/mp4'
                            : commandForm.responseType === 'Document Message'
                              ? 'application/pdf,text/plain'
                              : commandForm.configuration.mediaType === 'voice'
                                ? 'audio/ogg'
                                : 'audio/mpeg,audio/mp4,audio/ogg,audio/wav'
                      }
                      onChange={(event) =>
                        handleMediaUpload(
                          event.target.files?.[0],
                          commandForm.responseType === 'Photo Message'
                            ? 'photo'
                            : commandForm.responseType === 'Video Message'
                              ? 'video'
                              : commandForm.responseType === 'Document Message'
                                ? 'document'
                                : commandForm.configuration.mediaType || 'audio',
                          (media) => updateConfiguration({ media })
                        )
                      }
                      className={inputCls}
                    />
                    {mediaUploading && (
                      <span className="text-[11px] text-sky-600">Media yuklanmoqda…</span>
                    )}
                    {commandForm.configuration.media && (
                      <div className="flex gap-3 text-[11px]">
                        <button
                          type="button"
                          onClick={() =>
                            previewStoredMedia(
                              commandForm.configuration.media,
                              commandForm.responseType === 'Photo Message'
                                ? 'photo'
                                : commandForm.responseType === 'Video Message'
                                  ? 'video'
                                  : 'document'
                            )
                          }
                          className="text-sky-600"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => updateConfiguration({ media: '' })}
                          className="text-rose-500"
                        >
                          Media olib tashlash
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {renderKeyboardEditor('replyKeyboard', 'Reply Keyboard')}
            {renderKeyboardEditor('inlineKeyboard', 'Inline Keyboard', true)}
            <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-black/10">
              <p className="mb-2 text-[10px] font-semibold uppercase text-gray-500">
                Telegram preview
              </p>
              <p className="whitespace-pre-wrap wrap-break-word text-sm">
                {commandForm.responseTemplate ||
                  commandForm.configuration.messages
                    ?.map((message) => message.text)
                    .filter(Boolean)
                    .join('\n\n') ||
                  'Xabar matni preview’da ko‘rinadi.'}
              </p>
              {(commandForm.configuration.inlineKeyboard || []).map((row, rowIndex) => (
                <div key={`inline-preview-${rowIndex}`} className="mt-2 flex flex-wrap gap-1.5">
                  {row
                    .filter((button) => button.isActive !== false)
                    .map((button, buttonIndex) => (
                      <span
                        key={`inline-preview-${rowIndex}-${buttonIndex}`}
                        className="rounded border border-sky-500/30 px-2.5 py-1 text-[11px] text-sky-600"
                      >
                        {button.text || 'Tugma'}
                      </span>
                    ))}
                </div>
              ))}
              {(commandForm.configuration.replyKeyboard?.rows || []).map((row, rowIndex) => (
                <div key={`reply-preview-${rowIndex}`} className="mt-2 flex flex-wrap gap-1.5">
                  {row
                    .filter((button) => button.isActive !== false)
                    .map((button, buttonIndex) => (
                      <span
                        key={`reply-preview-${rowIndex}-${buttonIndex}`}
                        className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-[11px] text-gray-700"
                      >
                        {button.text || 'Tugma'}
                      </span>
                    ))}
                </div>
              ))}
              {mediaPreview?.type === 'photo' &&
                mediaPreview.reference === commandForm.configuration.media && (
                  <img
                    src={mediaPreview.url}
                    alt={mediaPreview.name || 'Yuklangan rasm'}
                    className="mt-3 max-h-48 rounded-lg object-contain"
                  />
                )}
              {mediaPreview?.type === 'video' &&
                mediaPreview.reference === commandForm.configuration.media && (
                  <video src={mediaPreview.url} controls className="mt-3 max-h-48 rounded-lg" />
                )}
              {mediaPreview && !['photo', 'video'].includes(mediaPreview.type) && (
                <p className="mt-3 text-xs text-gray-500">{mediaPreview.name}</p>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={commandForm.isActive}
                onChange={(e) => setCommandForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
              Buyruq aktiv
            </label>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={testCommandDraft}
                disabled={commandSaving || !telegramData.isActive}
                title={!telegramData.isActive ? 'Test uchun botni ulang' : 'Komandani sinash'}
                className="mr-2 inline-flex items-center gap-2 rounded-xl border border-sky-500/30 px-4 py-2.5 text-sm font-semibold text-sky-600 disabled:opacity-50"
              >
                <Send size={15} /> Sinash
              </button>
              <button
                type="submit"
                disabled={commandSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {commandSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                Saqlash
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-gray-200 dark:divide-white/10">
          {visibleCommands.map((command) => (
            <div
              key={command._id || command.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <code className="font-semibold text-sky-500">{command.command}</code>
                  <span
                    className={`text-[10px] ${command.isActive ? 'text-emerald-500' : 'text-gray-500'}`}
                  >
                    {command.isActive ? 'Faol' : 'Nofaol'}
                  </span>
                  {command.isSystem && <span className="text-[10px] text-gray-500">Tizim</span>}
                </div>
                <p className="truncate text-xs text-gray-500">
                  {command.title} · {command.description}
                </p>
                <p className="mt-1 text-[10px] text-gray-400">
                  {command.responseType || 'Text Message'} ·{' '}
                  {command.configuration?.inlineKeyboard?.length ||
                  command.configuration?.replyKeyboard?.length
                    ? 'Tugmalar bor'
                    : 'Tugmasiz'}{' '}
                  · Yangilandi{' '}
                  {command.updatedAt ? new Date(command.updatedAt).toLocaleString('uz-UZ') : '—'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onTestTelegramCommand?.(command)}
                  title="Komandani sinash"
                  aria-label={`${command.command} komandani sinash`}
                  className="rounded-lg p-2 text-gray-500 hover:bg-emerald-500/10 hover:text-emerald-600"
                >
                  <Send size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => duplicateCommand(command)}
                  title="Nusxalash"
                  aria-label={`${command.command} komandani nusxalash`}
                  className="rounded-lg p-2 text-gray-500 hover:bg-sky-500/10 hover:text-sky-500"
                >
                  <Copy size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => startCommandEdit(command)}
                  title="Tahrirlash"
                  aria-label={`${command.command} komandani tahrirlash`}
                  className="rounded-lg p-2 text-gray-500 hover:bg-sky-500/10 hover:text-sky-500"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSaveTelegramCommand({
                      ...command,
                      id: command._id || command.id,
                      isActive: !command.isActive,
                    })
                  }
                  title={command.isActive ? 'O‘chirish' : 'Faollashtirish'}
                  aria-label={`${command.command} ${command.isActive ? 'o‘chirish' : 'faollashtirish'}`}
                  className="rounded-lg px-2 py-1 text-[10px] text-gray-500 hover:bg-sky-500/10 hover:text-sky-500"
                >
                  {command.isActive ? 'Faol' : 'Nofaol'}
                </button>
                {!command.isSystem && (
                  <button
                    type="button"
                    onClick={() => removeCommand(command)}
                    title="O‘chirish"
                    aria-label={`${command.command} komandani o‘chirish`}
                    className="rounded-lg p-2 text-gray-500 hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {!visibleCommands.length && (
            <p className="py-5 text-center text-sm text-gray-500">
              {telegramCommands.length
                ? 'Qidiruv bo‘yicha komanda topilmadi.'
                : 'Komandalar topilmadi.'}
            </p>
          )}
        </div>
        {filteredCommands.length > pageSize && (
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>
              {commandPage + 1} / {pageCount}-sahifa
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!commandPage}
                onClick={() => setCommandPage((page) => page - 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40"
              >
                Oldingi
              </button>
              <button
                type="button"
                disabled={commandPage + 1 >= pageCount}
                onClick={() => setCommandPage((page) => page + 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
