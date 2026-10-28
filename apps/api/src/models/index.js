import mongoose from 'mongoose';

// 1. Organization Schema (Multi-tenant)
export const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  countryCode: { type: String, default: 'UZ' },
  timezone: { type: String, default: 'Asia/Tashkent' },
  currency: { type: String, default: 'UZS' },
  defaultLocale: { type: String, default: 'uz' },
  status: { type: String, default: 'active' },
  logoUrl: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  subscriptionPlan: { type: String, default: 'STARTER' }, // STARTER, PROFESSIONAL, ENTERPRISE
  subscriptionStatus: { type: String, default: 'ACTIVE' },
  subscriptionExpiresAt: { type: Date },
  settings: {
    smsTemplates: {
      dueSoon: { type: String, default: 'Assalomu alaykum {customer_name}. {vehicle} uchun moy almashtirish vaqti {due_date}. Lubrix Servis' },
      overdue: { type: String, default: 'Hurmatli {customer_name}, {vehicle} avtomobilingiz moy almashtirish muddati yetdi. Lubrix filiallariga marhamat!' }
    },
    smsSender: { type: String, default: '4546' },
    smsProvider: { type: String, default: 'eskiz' },
    autoReminders: { type: Boolean, default: true },
    workingDays: { type: String, default: 'Dushanba - Shanba' },
    tableDensity: { type: String, default: 'comfortable' },
    lowStockThreshold: { type: Number, default: 10 }
  }
}, { timestamps: true });

export const Organization = mongoose.model('Organization', OrganizationSchema);

// 2. User Schema (JWT Auth & Staff Management + Photo)
export const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  avatarUrl: { type: String },
  organizationId: { type: String, required: true, index: true },
  role: { 
    type: String, 
    enum: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'], 
    default: 'STAFF' 
  },
  phone: { type: String },
  branchId: { type: String },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);

// 3. Branch Schema
export const BranchSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  phone: { type: String },
  workingHours: { type: String, default: '08:30 - 20:30' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Branch = mongoose.model('Branch', BranchSchema);

// 4. Customer Schema
export const CustomerSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  fullName: { type: String, required: true },
  phoneE164: { type: String, required: true, index: true },
  email: { type: String },
  preferredLocale: { type: String, default: 'uz' },
  telegramChatId: { type: String },
  smsConsentAt: { type: Date, default: Date.now },
  telegramConsentAt: { type: Date },
  optedOutAt: { type: Date },
}, { timestamps: true });

export const Customer = mongoose.model('Customer', CustomerSchema);

// 5. Vehicle Schema
export const VehicleSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  customerId: { type: String, required: true, index: true },
  plateNumber: { type: String, required: true, uppercase: true, trim: true },
  plateCountry: { type: String, default: 'UZ' },
  make: { type: String, required: true },
  model: { type: String, required: true },
  modelYear: { type: Number },
  vin: { type: String },
  currentOdometerKm: { type: Number, default: 0 },
}, { timestamps: true });

export const Vehicle = mongoose.model('Vehicle', VehicleSchema);

// 6. ServiceRecord Schema
export const ServiceRecordSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  branchId: { type: String, required: true },
  vehicleId: { type: String, required: true },
  customerId: { type: String, required: true },
  customerName: { type: String },
  vehicle: { type: String },
  plate: { type: String },
  serviceDate: { type: Date, default: Date.now },
  odometerKm: { type: Number, required: true },
  oilBrand: { type: String, required: true },
  oilType: { type: String, required: true },
  viscosity: { type: String, required: true },
  oilQuantity: { type: Number, default: 4 },
  price: { type: Number, default: 0 },
  paymentMethod: { type: String, default: 'CASH' }, // CASH, UZCARD, HUMO, CLICK
  nextDueDate: { type: Date },
  nextDueKm: { type: Number },
  status: { type: String, default: 'Tugallandi' },
  notes: { type: String },
}, { timestamps: true });

export const ServiceRecord = mongoose.model('ServiceRecord', ServiceRecordSchema);

// 7. Reminder Schema
export const ReminderSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  serviceRecordId: { type: String },
  vehicleId: { type: String, required: true },
  customerId: { type: String, required: true },
  customerName: { type: String },
  vehicleLabel: { type: String },
  channel: { type: String, enum: ['SMS', 'TELEGRAM'], default: 'SMS' },
  dueAt: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['scheduled', 'queued', 'sending', 'sent', 'delivered', 'failed', 'cancelled', 'suppressed'],
    default: 'scheduled' 
  },
  idempotencyKey: { type: String, unique: true, required: true },
  attempts: { type: Number, default: 0 },
  lastError: { type: String },
}, { timestamps: true });

export const Reminder = mongoose.model('Reminder', ReminderSchema);

// 8. MessageLog Schema
export const MessageLogSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  reminderId: { type: String },
  customerName: { type: String },
  phone: { type: String },
  channel: { type: String, default: 'SMS' },
  provider: { type: String, default: 'mock' },
  providerMessageId: { type: String },
  status: { type: String, default: 'sent' },
  cost: { type: Number, default: 0 },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const MessageLog = mongoose.model('MessageLog', MessageLogSchema);

// 9. Product Schema
export const ProductSchema = new mongoose.Schema({
  organizationId: { type: String, index: true },
  name: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, default: 'Engine Oil' },
  oilType: { type: String, default: 'Synthetic' },
  viscosity: { type: String, default: '5W-30' },
  barcode: { type: String },
  standards: [{ type: String }],
  packageSizes: [{ type: String }],
  price: { type: Number, default: 120000 },
  purchasePrice: { type: Number, default: 90000 },
  description: { type: String },
  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

export const Product = mongoose.model('Product', ProductSchema);

// 10. ProductCategory Schema
export const ProductCategorySchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String },
}, { timestamps: true });

export const ProductCategory = mongoose.model('ProductCategory', ProductCategorySchema);

// 11. Inventory Schema
export const InventorySchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  branchId: { type: String, required: true, index: true },
  productId: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: 'L' },
  purchasePrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  minStockLevel: { type: Number, default: 10 },
  location: { type: String, default: 'A-01' },
}, { timestamps: true });

export const Inventory = mongoose.model('Inventory', InventorySchema);

// 12. StockMovement Schema
export const StockMovementSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  branchId: { type: String, required: true },
  productId: { type: String, required: true },
  type: { type: String, required: true }, // STOCK_IN, STOCK_OUT, ADJUSTMENT, WRITE_OFF, SERVICE_CONSUMPTION
  quantityBefore: { type: Number },
  quantityChanged: { type: Number },
  quantityAfter: { type: Number },
  reason: { type: String },
  userName: { type: String, default: 'Admin' },
}, { timestamps: true });

export const StockMovement = mongoose.model('StockMovement', StockMovementSchema);

// 13. Supplier Schema
export const SupplierSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  brands: [{ type: String }],
  rating: { type: Number, default: 5.0 },
  balance: { type: Number, default: 0 },
}, { timestamps: true });

export const Supplier = mongoose.model('Supplier', SupplierSchema);

// 14. PurchaseOrder Schema
export const PurchaseOrderSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  poNumber: { type: String, required: true, unique: true },
  supplierId: { type: String, required: true },
  supplierName: { type: String },
  branchId: { type: String, default: 'br-01' },
  totalAmount: { type: Number, default: 0 },
  status: { type: String, default: 'PENDING_DELIVERY' },
  itemsCount: { type: Number, default: 1 },
}, { timestamps: true });

export const PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema);

// 15. PaymentCard Schema (ONLY OWNER can add terminal/acceptance card)
export const PaymentCardSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  cardHolder: { type: String, required: true },
  cardNumberMasked: { type: String, required: true }, // e.g. 8600 **** **** 1234
  cardType: { type: String, enum: ['UZCARD', 'HUMO', 'VISA', 'MASTERCARD'], default: 'UZCARD' },
  expiry: { type: String, required: true },
  bankName: { type: String },
  terminalId: { type: String },
  isDefault: { type: Boolean, default: false },
  addedByUserId: { type: String, required: true },
}, { timestamps: true });

export const PaymentCard = mongoose.model('PaymentCard', PaymentCardSchema);

// 16. TelegramIntegration Schema (Multi-tenant bot per business)
export const TelegramIntegrationSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, unique: true, index: true },
  botToken: { type: String, required: true },
  botUsername: { type: String },
  botName: { type: String },
  webhookSecret: { type: String },
  isActive: { type: Boolean, default: false },
  ownerTelegramChatId: { type: String },
  welcomeMessage: { 
    type: String, 
    default: 'Assalomu alaykum! {business_name} rasmiy moy almashtirish xizmati botiga xush kelibsiz.' 
  },
  notifications: {
    newBooking: { type: Boolean, default: true },
    bookingCancelled: { type: Boolean, default: true },
    newCustomer: { type: Boolean, default: true },
    serviceCompleted: { type: Boolean, default: true },
    lowStock: { type: Boolean, default: true },
    failedSms: { type: Boolean, default: true },
    dailyReport: { type: Boolean, default: true }
  },
  lastError: { type: String },
  lastSyncedAt: { type: Date }
}, { timestamps: true });

export const TelegramIntegration = mongoose.model('TelegramIntegration', TelegramIntegrationSchema);

// 17. Booking Schema (Online & Telegram Appointments)
export const BookingSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  branchId: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  telegramChatId: { type: String },
  plateNumber: { type: String, uppercase: true },
  serviceType: { type: String, default: 'Moy almashtirish' },
  bookingDate: { type: Date, required: true },
  bookingTime: { type: String, required: true }, // e.g. "14:30"
  status: { 
    type: String, 
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'], 
    default: 'PENDING' 
  },
  source: { type: String, enum: ['TELEGRAM', 'WEB', 'PHONE', 'WALK_IN'], default: 'TELEGRAM' },
  notes: { type: String }
}, { timestamps: true });

export const Booking = mongoose.model('Booking', BookingSchema);

// 18. CameraSetting Schema (Automatic ANPR on service lane)
export const CameraSettingSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  branchId: { type: String, required: true },
  cameraName: { type: String, default: '1-Yo‘lak Kirish Kamerasi' },
  streamUrl: { type: String }, // RTSP, IP URL or USB Device
  autoANPR: { type: Boolean, default: true },
  actionOnDetect: { type: String, enum: ['OPEN_SERVICE', 'NOTIFY_MASTER', 'RECORD_ONLY'], default: 'OPEN_SERVICE' },
  isActive: { type: Boolean, default: true },
  minConfidence: { type: Number, default: 85 }
}, { timestamps: true });

export const CameraSetting = mongoose.model('CameraSetting', CameraSettingSchema);

// 19. AuditLog Schema
export const AuditLogSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  userId: { type: String },
  userName: { type: String },
  action: { type: String, required: true }, // CREATE, UPDATE, DELETE, LOGIN, EXPORT, PAYMENT
  entity: { type: String, required: true }, // CUSTOMER, SERVICE, INVENTORY, SETTINGS, TELEGRAM, PAYMENT
  entityId: { type: String },
  method: { type: String },
  path: { type: String },
  details: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String }
}, { timestamps: true });

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// 20. Transaction Schema (Payments: Click, Payme, Uzum, Uzcard, Humo, Cash, Terminal)
export const TransactionSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  branchId: { type: String },
  serviceId: { type: String },
  customerId: { type: String },
  customerName: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'UZS' },
  provider: {
    type: String,
    enum: ['CLICK', 'PAYME', 'UZUM', 'UZCARD', 'HUMO', 'TERMINAL', 'CASH'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['PAID', 'PENDING', 'FAILED', 'CANCELLED', 'REFUNDED'],
    default: 'PENDING',
    index: true
  },
  transactionId: { type: String, index: true }, // External provider reference
  merchantTransactionId: { type: String, unique: true, sparse: true },
  payerPhone: { type: String },
  payerCardMasked: { type: String },
  paidAt: { type: Date },
  items: [{
    productId: { type: String },
    name: { type: String },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }],
  notes: { type: String },
  receiptNumber: { type: String },
  createdByUserId: { type: String }
}, { timestamps: true });

export const Transaction = mongoose.model('Transaction', TransactionSchema);

// 21. Invoice Schema (Customer Invoices & Billing)
export const InvoiceSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, index: true },
  invoiceNumber: { type: String, required: true },
  customerId: { type: String },
  customerName: { type: String, required: true },
  customerPhone: { type: String },
  vehiclePlate: { type: String },
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['DRAFT', 'ISSUED', 'PAID', 'CANCELLED'],
    default: 'ISSUED'
  },
  paymentMethod: { type: String },
  paidAt: { type: Date },
  dueDate: { type: Date },
  issuedBy: { type: String }
}, { timestamps: true });

export const Invoice = mongoose.model('Invoice', InvoiceSchema);

