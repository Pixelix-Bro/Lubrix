import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

const GET_CACHE_TTL = 30_000
const getResponseCache = new Map()

const cachedGet = (url, config = {}) => {
  const key = `${url}:${JSON.stringify(config.params || {})}`
  const cached = getResponseCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.promise

  const request = apiClient
    .get(url, config)
    .then((response) => {
      getResponseCache.set(key, {
        promise: Promise.resolve(response),
        expiresAt: Date.now() + GET_CACHE_TTL,
      })
      return response
    })
    .catch((error) => {
      getResponseCache.delete(key)
      throw error
    })

  getResponseCache.set(key, { promise: request, expiresAt: Number.POSITIVE_INFINITY })
  return request
}

export const clearApiDataCache = () => getResponseCache.clear()

let csrfTokenMemory = ''
let refreshPromise = null

const refreshSession = () => {
  if (!refreshPromise) {
    const request = () => apiClient.post('/auth/refresh', {})
    const lockRequest = () =>
      navigator.locks?.request ? navigator.locks.request('lubrix-auth-refresh', request) : request()
    refreshPromise = lockRequest().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

const readCsrfCookie = () => {
  const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith('lubrix_csrf='))
  return entry ? decodeURIComponent(entry.slice('lubrix_csrf='.length)) : ''
}

apiClient.interceptors.request.use(
  async (config) => {
    const method = String(config.method || 'get').toUpperCase()
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      let csrfToken = csrfTokenMemory || readCsrfCookie()
      if (!csrfToken && !String(config.url || '').includes('/auth/csrf')) {
        const response = await apiClient.get('/auth/csrf')
        csrfToken = response.data?.csrfToken || ''
      }
      if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    if (response.data?.csrfToken) csrfTokenMemory = response.data.csrfToken
    const method = String(response.config?.method || 'get').toUpperCase()
    if (method !== 'GET') clearApiDataCache()
    if (String(response.config?.url || '').includes('/auth/logout')) csrfTokenMemory = ''
    return response
  },
  (error) => {
    const config = error.config
    const url = String(config?.url || '')
    if (
      error.response?.status === 401 &&
      config &&
      !config._authRetry &&
      !['/auth/login', '/auth/refresh', '/auth/logout'].some((path) => url.includes(path))
    ) {
      config._authRetry = true
      return refreshSession()
        .then(() => apiClient(config))
        .catch((refreshError) => {
          if (refreshError.response?.status === 401) {
            csrfTokenMemory = ''
            clearApiDataCache()
            window.dispatchEvent(new Event('lubrix:auth-expired'))
          }
          return Promise.reject(refreshError)
        })
    }
    if (error.response?.status === 401 && url.includes('/auth/refresh')) {
      clearApiDataCache()
      window.dispatchEvent(new Event('lubrix:auth-expired'))
    }
    return Promise.reject(error)
  }
)

export const lubrixApi = {
  // Authentication
  getCsrf: () => apiClient.get('/auth/csrf'),
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (data) => apiClient.post('/auth/register', data),
  checkoutRegister: (data) => apiClient.post('/auth/checkout-register', data),
  createSignupPayment: (data) => apiClient.post('/payments/signup/intents', data),
  getSignupPayment: (id) => apiClient.get(`/payments/signup/intents/${id}`),
  askAssistant: (question) => apiClient.post('/assistant/ask', { question }),
  analyzePlateWithAI: (imageDataUrl) =>
    apiClient.post('/assistant/analyze-plate', { imageDataUrl }),
  getMe: () => apiClient.get('/auth/me'),
  getSessions: () => cachedGet('/auth/sessions'),
  revokeSession: (id) => apiClient.delete(`/auth/sessions/${id}`),
  logout: () => apiClient.post('/auth/logout'),

  // Analytics & Dashboard
  getDashboardAnalytics: () => cachedGet('/analytics/dashboard'),
  getOverview: () => cachedGet('/analytics/overview'),
  getReports: (params) => cachedGet('/analytics/reports', { params }),

  // Customers
  getCustomers: (search = '', page = 1, limit = 100) =>
    cachedGet('/customers', { params: { search, page, limit } }),
  getCustomerById: (id) => apiClient.get(`/customers/${id}`),
  getCustomerProfile: (id) => apiClient.get(`/customers/${id}/profile`),
  createCustomer: (data) => apiClient.post('/customers', data),
  updateCustomer: (id, data) => apiClient.put(`/customers/${id}`, data),
  deleteCustomer: (id) => apiClient.delete(`/customers/${id}`),

  // Vehicles
  getVehicles: (params = {}) => cachedGet('/vehicles', { params }),
  getVehicleById: (id) => apiClient.get(`/vehicles/${id}`),
  createVehicle: (data) => apiClient.post('/vehicles', data),
  updateVehicle: (id, data) => apiClient.put(`/vehicles/${id}`, data),
  deleteVehicle: (id) => apiClient.delete(`/vehicles/${id}`),

  // Services
  getServices: (params = {}) => cachedGet('/services', { params }),
  getServiceById: (id) => apiClient.get(`/services/${id}`),
  createService: (data) => apiClient.post('/services', data),
  getServiceStats: () => cachedGet('/services/stats'),

  // Technical inspections
  createInspection: (data) => apiClient.post('/inspections', data),
  getInspections: (params = {}) => cachedGet('/inspections', { params }),
  getInspection: (id) => apiClient.get(`/inspections/${id}`),
  updateInspection: (id, data) => apiClient.patch(`/inspections/${id}`, data),
  cancelInspection: (id) => apiClient.post(`/inspections/${id}/cancel`),

  // Reminders
  getReminders: (params = {}) => cachedGet('/reminders', { params }),
  getReminderById: (id) => apiClient.get(`/reminders/${id}`),
  sendReminderSms: (reminderId) => apiClient.post(`/reminders/${reminderId}/send`),
  updateReminder: (id, data) => apiClient.patch(`/reminders/${id}`, data),

  // Branches
  getBranches: () => cachedGet('/branches'),
  createBranch: (data) => apiClient.post('/branches', data),
  updateBranch: (id, data) => apiClient.put(`/branches/${id}`, data),

  // Staff
  getStaff: () => cachedGet('/staff'),
  createStaff: (data) => apiClient.post('/staff', data),
  updateStaff: (id, data) => apiClient.put(`/staff/${id}`, data),

  // Settings
  getSettings: () => cachedGet('/settings'),
  updateSettings: (data) => apiClient.patch('/settings', data),
  updateProfile: (data) => apiClient.put('/settings/profile', data),

  // Payment Cards (Only OWNER)
  getPaymentCards: () => cachedGet('/settings/cards'),
  addPaymentCard: (data) => apiClient.post('/settings/cards', data),
  updatePaymentCard: (id, data) => apiClient.put(`/settings/cards/${id}`, data),
  deletePaymentCard: (id) => apiClient.delete(`/settings/cards/${id}`),

  // Service Lane Camera ANPR Settings
  getCameraSettings: () => cachedGet('/settings/camera'),
  saveCameraSetting: (data) => apiClient.post('/settings/camera', data),

  // Product Categories
  getCategories: () => cachedGet('/settings/categories'),
  createCategory: (data) => apiClient.post('/settings/categories', data),
  updateCategory: (id, data) => apiClient.put(`/settings/categories/${id}`, data),
  deleteCategory: (id) => apiClient.delete(`/settings/categories/${id}`),

  // Audit Logs
  getAuditLogs: (params = {}) => cachedGet('/settings/audit-logs', { params }),

  // Telegram Integration
  getTelegramStatus: () => cachedGet('/integrations/telegram/status'),
  verifyTelegramToken: (botToken) => apiClient.post('/integrations/telegram/verify', { botToken }),
  saveTelegramIntegration: (data) => apiClient.post('/integrations/telegram/save', data),
  disconnectTelegram: () => apiClient.post('/integrations/telegram/disconnect'),
  sendTelegramTest: (chatId) => apiClient.post('/integrations/telegram/test', { chatId }),
  getTelegramCommands: () => cachedGet('/integrations/telegram/commands'),
  saveTelegramCommand: (data) => apiClient.post('/integrations/telegram/commands', data),
  testTelegramCommand: (id) => apiClient.post('/integrations/telegram/commands/test', { id }),
  uploadTelegramMedia: (file, mediaType) => {
    const formData = new FormData()
    formData.append('media', file)
    formData.append('mediaType', mediaType)
    return apiClient.post('/integrations/telegram/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getTelegramMedia: (id) =>
    apiClient.get(`/integrations/telegram/media/${id}`, { responseType: 'blob' }),
  deleteTelegramCommand: (id) => apiClient.delete(`/integrations/telegram/commands/${id}`),
  getTelegramServices: () => cachedGet('/integrations/telegram/services'),
  saveTelegramService: (data) => apiClient.post('/integrations/telegram/services', data),
  deleteTelegramService: (id) => apiClient.delete(`/integrations/telegram/services/${id}`),

  getCampaigns: () => cachedGet('/notifications/campaigns'),
  previewCampaign: (segment) =>
    apiClient.get('/notifications/campaigns/preview', { params: { segment } }),
  launchCampaign: (data) => apiClient.post('/notifications/campaigns/launch', data),
  getSmsTemplates: () => cachedGet('/notifications/templates'),
  saveSmsTemplate: (data) => apiClient.post('/notifications/templates', data),
  deleteSmsTemplate: (id) => apiClient.delete(`/notifications/templates/${id}`),
  getInbox: () => cachedGet('/notifications/inbox'),
  markInboxRead: () => apiClient.post('/notifications/inbox/read'),
  markInboxItemRead: (id) => apiClient.patch(`/notifications/inbox/${id}/read`),
  dismissInboxItem: (id) => apiClient.delete(`/notifications/inbox/${id}`),

  // Inventory & Products
  getInventoryDashboard: (branchId) => cachedGet('/inventory/dashboard', { params: { branchId } }),
  getProducts: (params) => cachedGet('/products', { params }),
  createProduct: (data) => apiClient.post('/products', data),
  updateProduct: (id, data) => apiClient.put(`/products/${id}`, data),
  deleteProduct: (id) => apiClient.delete(`/products/${id}`),
  getInventory: (params) => cachedGet('/inventory', { params }),
  performStockOperation: (data) => apiClient.post('/inventory/operations', data),
  getStockMovements: (branchId) => cachedGet('/inventory/movements', { params: { branchId } }),
  getSuppliers: () => cachedGet('/suppliers'),
  createSupplier: (data) => apiClient.post('/suppliers', data),
  updateSupplier: (id, data) => apiClient.put(`/suppliers/${id}`, data),
  deleteSupplier: (id) => apiClient.delete(`/suppliers/${id}`),
  getPurchases: () => cachedGet('/purchases'),
  createPurchase: (data) => apiClient.post('/purchases', data),
  updatePurchase: (id, data) => apiClient.put(`/purchases/${id}`, data),
  deletePurchase: (id) => apiClient.delete(`/purchases/${id}`),

  // Notifications & Audit Logs
  getNotificationLogs: (params) => cachedGet('/notifications/logs', { params }),
  getNotificationStats: () => cachedGet('/notifications/stats'),

  // Payments & Invoices (Click, Payme, Uzum, POS Terminal)
  createPaymentIntent: (data) => apiClient.post('/payments/create-intent', data),
  posCharge: (data) => apiClient.post('/payments/pos-charge', data),
  confirmPosPayment: (data) => apiClient.post('/payments/pos-confirm', data),
  getTransactions: (params = {}) => cachedGet('/payments/transactions', { params }),
  getInvoices: () => cachedGet('/payments/invoices'),
  createInvoice: (data) => apiClient.post('/payments/invoices', data),
}

const APP_DATA_REQUESTS = [
  { required: true, request: () => lubrixApi.getDashboardAnalytics() },
  { required: true, request: () => lubrixApi.getServices({ limit: 20 }) },
  { required: true, request: () => lubrixApi.getReminders() },
  { request: () => lubrixApi.getOverview() },
  { request: () => lubrixApi.getReports({ year: new Date().getFullYear() }) },
  { request: () => lubrixApi.getCustomers() },
  { request: () => lubrixApi.getVehicles() },
  { request: () => lubrixApi.getVehicles({ limit: 100 }) },
  { request: () => lubrixApi.getServices() },
  { request: () => lubrixApi.getServiceStats() },
  { request: () => lubrixApi.getInspections() },
  { request: () => lubrixApi.getSessions() },
  { request: () => lubrixApi.getBranches() },
  { request: () => lubrixApi.getStaff() },
  { request: () => lubrixApi.getSettings() },
  { request: () => lubrixApi.getPaymentCards() },
  { request: () => lubrixApi.getCameraSettings() },
  { request: () => lubrixApi.getCategories() },
  { request: () => lubrixApi.getAuditLogs() },
  { request: () => lubrixApi.getTelegramStatus() },
  { request: () => lubrixApi.getTelegramCommands() },
  { request: () => lubrixApi.getTelegramServices() },
  { request: () => lubrixApi.getCampaigns() },
  { request: () => lubrixApi.getSmsTemplates() },
  { request: () => lubrixApi.getInbox() },
  { request: () => lubrixApi.getNotificationStats() },
  { request: () => lubrixApi.getNotificationLogs() },
  { request: () => lubrixApi.getInventoryDashboard('') },
  { request: () => lubrixApi.getProducts() },
  { request: () => lubrixApi.getProducts({ search: '' }) },
  { request: () => lubrixApi.getInventory({ branchId: '' }) },
  { request: () => lubrixApi.getStockMovements('') },
  { request: () => lubrixApi.getSuppliers() },
  { request: () => lubrixApi.getPurchases() },
  { request: () => lubrixApi.getTransactions() },
  { request: () => lubrixApi.getInvoices() },
]

export const preloadAppData = async () => {
  const failures = []
  const batchSize = 8

  for (let start = 0; start < APP_DATA_REQUESTS.length; start += batchSize) {
    const batch = APP_DATA_REQUESTS.slice(start, start + batchSize)
    const results = await Promise.allSettled(batch.map(({ request }) => request()))
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        failures.push({ request: batch[index], error: result.reason })
      }
    })
  }

  const requiredFailure = failures.find(({ request }) => request.required)
  if (requiredFailure) throw requiredFailure.error

  return { optionalFailures: failures.length }
}

export default apiClient
