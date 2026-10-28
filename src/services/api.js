import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to all requests
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('lubrix_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const pathname = window.location.pathname;
      if (!['/login', '/register', '/plans', '/checkout'].includes(pathname)) {
        try {
          localStorage.removeItem('lubrix_token');
          localStorage.removeItem('lubrix_user');
        } catch {
          // ignore
        }
      }
    }
    return Promise.reject(error);
  }
);

export const lubrixApi = {
  // Authentication
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (data) => apiClient.post('/auth/register', data),
  checkoutRegister: (data) => apiClient.post('/auth/checkout-register', data),
  getMe: () => apiClient.get('/auth/me'),
  logout: () => apiClient.post('/auth/logout'),

  // Analytics & Dashboard
  getDashboardAnalytics: () => apiClient.get('/analytics/dashboard'),
  getOverview: () => apiClient.get('/analytics/overview'),
  getReports: (params) => apiClient.get('/analytics/reports', { params }),

  // Customers
  getCustomers: (search = '', page = 1, limit = 100) =>
    apiClient.get('/customers', { params: { search, page, limit } }),
  getCustomerById: (id) => apiClient.get(`/customers/${id}`),
  createCustomer: (data) => apiClient.post('/customers', data),
  updateCustomer: (id, data) => apiClient.put(`/customers/${id}`, data),
  deleteCustomer: (id) => apiClient.delete(`/customers/${id}`),

  // Vehicles
  getVehicles: (params = {}) => apiClient.get('/vehicles', { params }),
  getVehicleById: (id) => apiClient.get(`/vehicles/${id}`),
  createVehicle: (data) => apiClient.post('/vehicles', data),
  updateVehicle: (id, data) => apiClient.put(`/vehicles/${id}`, data),
  deleteVehicle: (id) => apiClient.delete(`/vehicles/${id}`),

  // Services
  getServices: (params = {}) => apiClient.get('/services', { params }),
  getServiceById: (id) => apiClient.get(`/services/${id}`),
  createService: (data) => apiClient.post('/services', data),
  getServiceStats: () => apiClient.get('/services/stats'),

  // Reminders
  getReminders: (params = {}) => apiClient.get('/reminders', { params }),
  getReminderById: (id) => apiClient.get(`/reminders/${id}`),
  sendReminderSms: (reminderId) => apiClient.post(`/reminders/${reminderId}/send`),
  updateReminder: (id, data) => apiClient.patch(`/reminders/${id}`, data),

  // Branches
  getBranches: () => apiClient.get('/branches'),
  createBranch: (data) => apiClient.post('/branches', data),
  updateBranch: (id, data) => apiClient.put(`/branches/${id}`, data),

  // Staff
  getStaff: () => apiClient.get('/staff'),
  createStaff: (data) => apiClient.post('/staff', data),
  updateStaff: (id, data) => apiClient.put(`/staff/${id}`, data),

  // Settings
  getSettings: () => apiClient.get('/settings'),
  updateSettings: (data) => apiClient.patch('/settings', data),
  updateProfile: (data) => apiClient.put('/settings/profile', data),

  // Payment Cards (Only OWNER)
  getPaymentCards: () => apiClient.get('/settings/cards'),
  addPaymentCard: (data) => apiClient.post('/settings/cards', data),
  deletePaymentCard: (id) => apiClient.delete(`/settings/cards/${id}`),

  // Service Lane Camera ANPR Settings
  getCameraSettings: () => apiClient.get('/settings/camera'),
  saveCameraSetting: (data) => apiClient.post('/settings/camera', data),

  // Product Categories
  getCategories: () => apiClient.get('/settings/categories'),
  createCategory: (data) => apiClient.post('/settings/categories', data),
  deleteCategory: (id) => apiClient.delete(`/settings/categories/${id}`),

  // Audit Logs
  getAuditLogs: () => apiClient.get('/settings/audit-logs'),

  // Telegram Integration
  getTelegramStatus: () => apiClient.get('/integrations/telegram/status'),
  verifyTelegramToken: (botToken) => apiClient.post('/integrations/telegram/verify', { botToken }),
  saveTelegramIntegration: (data) => apiClient.post('/integrations/telegram/save', data),
  disconnectTelegram: () => apiClient.post('/integrations/telegram/disconnect'),
  sendTelegramTest: (chatId) => apiClient.post('/integrations/telegram/test', { chatId }),

  // Inventory & Products
  getInventoryDashboard: (branchId) =>
    apiClient.get('/inventory/dashboard', { params: { branchId } }),
  getProducts: (params) => apiClient.get('/products', { params }),
  createProduct: (data) => apiClient.post('/products', data),
  updateProduct: (id, data) => apiClient.put(`/products/${id}`, data),
  deleteProduct: (id) => apiClient.delete(`/products/${id}`),
  getInventory: (params) => apiClient.get('/inventory', { params }),
  performStockOperation: (data) => apiClient.post('/inventory/operations', data),
  getStockMovements: (branchId) =>
    apiClient.get('/inventory/movements', { params: { branchId } }),
  getSuppliers: () => apiClient.get('/suppliers'),
  createSupplier: (data) => apiClient.post('/suppliers', data),
  getPurchases: () => apiClient.get('/purchases'),
  createPurchase: (data) => apiClient.post('/purchases', data),

  // Notifications & Audit Logs
  getNotificationLogs: (params) => apiClient.get('/notifications/logs', { params }),
  getNotificationStats: () => apiClient.get('/notifications/stats'),

  // Payments & Invoices (Click, Payme, Uzum, POS Terminal)
  createPaymentIntent: (data) => apiClient.post('/payments/create-intent', data),
  posCharge: (data) => apiClient.post('/payments/pos-charge', data),
  getTransactions: (params = {}) => apiClient.get('/payments/transactions', { params }),
  getInvoices: () => apiClient.get('/payments/invoices'),
  createInvoice: (data) => apiClient.post('/payments/invoices', data),
};

export default apiClient;
