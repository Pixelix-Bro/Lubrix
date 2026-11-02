import crypto from 'crypto'
import mongoose from 'mongoose'

const telegramEncryptionSecret = process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET
if (process.env.NODE_ENV === 'production' && !telegramEncryptionSecret) {
  throw new Error('Production uchun TELEGRAM_TOKEN_ENCRYPTION_KEY yoki JWT_SECRET sozlanishi shart')
}
const telegramTokenKey = () =>
  crypto
    .createHash('sha256')
    .update(
      process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY ||
        process.env.JWT_SECRET ||
        'lubrix-dev-secret-change-in-production'
    )
    .digest()

const encryptTelegramToken = (value) => {
  const token = String(value || '')
  if (!token || token.startsWith('enc:v1:')) return token
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', telegramTokenKey(), iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return `enc:v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`
}

const decryptTelegramToken = (value) => {
  const token = String(value || '')
  if (!token.startsWith('enc:v1:')) return token
  const [, , iv, authTag, encrypted] = token.split(':')
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    telegramTokenKey(),
    Buffer.from(iv, 'base64url')
  )
  decipher.setAuthTag(Buffer.from(authTag, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

// 1. Organization Schema (Multi-tenant)
export const OrganizationSchema = new mongoose.Schema(
  {
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
        dueSoon: {
          type: String,
          default:
            'Assalomu alaykum {customer_name}. {vehicle} uchun moy almashtirish vaqti {due_date}. Lubrix Servis',
        },
        overdue: {
          type: String,
          default:
            'Hurmatli {customer_name}, {vehicle} avtomobilingiz moy almashtirish muddati yetdi. Lubrix filiallariga marhamat!',
        },
      },
      smsSender: { type: String, default: '4546' },
      smsProvider: { type: String, default: 'eskiz' },
      autoReminders: { type: Boolean, default: true },
      workingDays: { type: String, default: 'Dushanba - Shanba' },
      tableDensity: { type: String, default: 'comfortable' },
      lowStockThreshold: { type: Number, default: 10 },
    },
  },
  { timestamps: true }
)

export const Organization = mongoose.model('Organization', OrganizationSchema)

// 2. User Schema (JWT Auth & Staff Management + Photo)
export const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
    organizationId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'],
      default: 'STAFF',
    },
    phone: { type: String },
    branchId: { type: String },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
)

export const User = mongoose.model('User', UserSchema)

export const AuthSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    usedRefreshTokenHashes: { type: [String], default: [] },
    csrfTokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: Date.now },
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true }
)

AuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
AuthSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 })

export const AuthSession = mongoose.model('AuthSession', AuthSessionSchema)

// 3. Branch Schema
export const BranchSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    region: { type: String, trim: true },
    district: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    phone: { type: String },
    workingHours: { type: String, default: '08:30 - 20:30' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Branch = mongoose.model('Branch', BranchSchema)

// 4. Customer Schema
export const CustomerSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    fullName: { type: String, required: true },
    phoneE164: { type: String, index: true },
    email: { type: String },
    photoUrl: { type: String, maxlength: 2_100_000 },
    preferredLocale: { type: String, default: 'uz' },
    customerType: { type: String, enum: ['REGULAR', 'WALK_IN'], default: 'REGULAR' },
    telegramChatId: { type: String },
    smsConsentAt: { type: Date },
    smsConsentSource: { type: String },
    telegramConsentAt: { type: Date },
    optedOutAt: { type: Date },
  },
  { timestamps: true }
)

export const Customer = mongoose.model('Customer', CustomerSchema)

// 5. Vehicle Schema
export const VehicleSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    customerId: { type: String, index: true },
    plateNumber: { type: String, required: true, uppercase: true, trim: true },
    plateCountry: { type: String, default: 'UZ' },
    make: { type: String, default: '' },
    model: { type: String, default: '' },
    modelYear: { type: Number },
    vin: { type: String },
    imageUrl: { type: String, maxlength: 2_100_000 },
    currentOdometerKm: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const Vehicle = mongoose.model('Vehicle', VehicleSchema)

// 6. ServiceRecord Schema
export const ServiceRecordSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    branchId: { type: String, required: true },
    vehicleId: { type: String },
    customerId: { type: String },
    customerName: { type: String },
    vehicle: { type: String },
    plate: { type: String },
    serviceDate: { type: Date, default: Date.now },
    odometerKm: { type: Number, required: true },
    oilBrand: { type: String, required: true },
    oilType: { type: String, required: true },
    viscosity: { type: String, required: true },
    oilQuantity: { type: Number, required: true, min: 0.01 },
    price: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'CASH' }, // CASH, UZCARD, HUMO, CLICK
    nextDueDate: { type: Date },
    nextDueKm: { type: Number },
    status: { type: String, default: 'Tugallandi' },
    notes: { type: String },
  },
  { timestamps: true }
)

ServiceRecordSchema.index({ organizationId: 1, serviceDate: -1 })

export const ServiceRecord = mongoose.model('ServiceRecord', ServiceRecordSchema)

export const InspectionPointSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    status: {
      type: String,
      enum: ['NOT_CHECKED', 'GOOD', 'ATTENTION', 'CRITICAL'],
      required: true,
    },
    note: { type: String, default: '', maxlength: 1000 },
    recommendation: { type: String, default: '', maxlength: 1000 },
    imageUrl: { type: String, default: '' },
  },
  { _id: false }
)

export const InspectionReportSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    vehicleId: { type: String, required: true, index: true },
    vehiclePlate: { type: String, required: true },
    vehicleLabel: { type: String, default: '' },
    branchId: { type: String, default: '' },
    technicianId: { type: String, required: true },
    technicianName: { type: String, required: true },
    odometerKm: { type: Number, required: true, min: 0 },
    inspectedAt: { type: Date, required: true, default: Date.now },
    points: {
      type: [InspectionPointSchema],
      required: true,
      validate: [(items) => items.length === 15, 'Inspection must contain 15 points'],
    },
    overallStatus: {
      type: String,
      enum: ['NOT_CHECKED', 'GOOD', 'ATTENTION', 'CRITICAL'],
      required: true,
    },
    notes: { type: String, default: '', maxlength: 3000 },
    status: { type: String, enum: ['DRAFT', 'COMPLETED', 'CANCELLED'], default: 'DRAFT' },
  },
  { timestamps: true }
)

InspectionReportSchema.index({ organizationId: 1, vehicleId: 1, inspectedAt: -1 })
InspectionReportSchema.index({ organizationId: 1, customerId: 1, inspectedAt: -1 })

export const InspectionReport = mongoose.model('InspectionReport', InspectionReportSchema)

// 7. Reminder Schema
export const ReminderSchema = new mongoose.Schema(
  {
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
      enum: [
        'scheduled',
        'queued',
        'sending',
        'sent',
        'delivered',
        'failed',
        'cancelled',
        'suppressed',
      ],
      default: 'scheduled',
    },
    idempotencyKey: { type: String, unique: true, required: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
  },
  { timestamps: true }
)

export const Reminder = mongoose.model('Reminder', ReminderSchema)

// 8. MessageLog Schema
export const MessageLogSchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true }
)

export const MessageLog = mongoose.model('MessageLog', MessageLogSchema)

// 9. Product Schema
export const ProductSchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true }
)

export const Product = mongoose.model('Product', ProductSchema)

// 10. ProductCategory Schema
export const ProductCategorySchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true }
)

export const ProductCategory = mongoose.model('ProductCategory', ProductCategorySchema)

// 11. Inventory Schema
export const InventorySchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    productId: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: 'L' },
    purchasePrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    minStockLevel: { type: Number, default: 10 },
    location: { type: String, default: 'A-01' },
  },
  { timestamps: true }
)

export const Inventory = mongoose.model('Inventory', InventorySchema)

// 12. StockMovement Schema
export const StockMovementSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    branchId: { type: String, required: true },
    productId: { type: String, required: true },
    type: { type: String, required: true }, // STOCK_IN, STOCK_OUT, ADJUSTMENT, WRITE_OFF, SERVICE_CONSUMPTION
    quantityBefore: { type: Number },
    quantityChanged: { type: Number },
    quantityAfter: { type: Number },
    reason: { type: String },
    userName: { type: String, default: 'Admin' },
  },
  { timestamps: true }
)

export const StockMovement = mongoose.model('StockMovement', StockMovementSchema)

// 13. Supplier Schema
export const SupplierSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    contactPerson: { type: String },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    brands: [{ type: String }],
    rating: { type: Number, default: 5.0 },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const Supplier = mongoose.model('Supplier', SupplierSchema)

// 14. PurchaseOrder Schema
export const PurchaseOrderSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    poNumber: { type: String, required: true, unique: true },
    supplierId: { type: String, required: true },
    supplierName: { type: String },
    branchId: { type: String, default: 'br-01' },
    totalAmount: { type: Number, default: 0 },
    status: { type: String, default: 'PENDING_DELIVERY' },
    itemsCount: { type: Number, default: 1 },
  },
  { timestamps: true }
)

export const PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema)

// 15. PaymentCard Schema (ONLY OWNER can add terminal/acceptance card)
export const PaymentCardSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    cardHolder: { type: String, required: true },
    cardNumberMasked: { type: String, required: true }, // e.g. 8600 **** **** 1234
    cardType: { type: String, enum: ['UZCARD', 'HUMO', 'VISA', 'MASTERCARD'], default: 'UZCARD' },
    expiry: { type: String, required: true },
    bankName: { type: String },
    terminalId: { type: String },
    isDefault: { type: Boolean, default: false },
    addedByUserId: { type: String, required: true },
  },
  { timestamps: true }
)

export const PaymentCard = mongoose.model('PaymentCard', PaymentCardSchema)

// 16. TelegramIntegration Schema (Multi-tenant bot per business)
export const TelegramIntegrationSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, unique: true, index: true },
    botToken: {
      type: String,
      required: true,
      set: encryptTelegramToken,
      get: decryptTelegramToken,
    },
    botId: { type: String },
    botUsername: { type: String },
    botName: { type: String },
    webhookSecret: { type: String },
    isActive: { type: Boolean, default: false },
    defaultCommandsVersion: { type: Number, default: 0 },
    ownerTelegramChatId: { type: String },
    welcomeMessage: {
      type: String,
      default:
        'Assalomu alaykum! {business_name} rasmiy moy almashtirish xizmati botiga xush kelibsiz.',
    },
    welcomeMediaId: { type: String },
    notifications: {
      newBooking: { type: Boolean, default: true },
      bookingCancelled: { type: Boolean, default: true },
      newCustomer: { type: Boolean, default: true },
      serviceCompleted: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
      planExpiry: { type: Boolean, default: true },
      failedSms: { type: Boolean, default: true },
      dailyReport: { type: Boolean, default: true },
    },
    lastError: { type: String },
    lastSyncedAt: { type: Date },
    lastUpdateId: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const TelegramIntegration = mongoose.model('TelegramIntegration', TelegramIntegrationSchema)

export const TelegramCommandSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    command: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    responseTemplate: { type: String, default: '' },
    responseType: {
      type: String,
      enum: [
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
      ],
      default: 'Text Message',
    },
    configuration: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const TelegramCommand = mongoose.model('TelegramCommand', TelegramCommandSchema)

export const TelegramMediaSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    botId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    mediaType: {
      type: String,
      enum: ['photo', 'video', 'document', 'audio', 'voice'],
      required: true,
    },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: true }
)

export const TelegramMedia = mongoose.model('TelegramMedia', TelegramMediaSchema)

export const TelegramUserSessionSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    telegramUserId: { type: String, required: true },
    chatId: { type: String, required: true },
    state: { type: String, default: 'idle' },
    data: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)
TelegramUserSessionSchema.index(
  { organizationId: 1, telegramUserId: 1, chatId: 1 },
  { unique: true }
)
TelegramUserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const TelegramUserSession = mongoose.model('TelegramUserSession', TelegramUserSessionSchema)

export const TelegramProcessedUpdateSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true },
    updateId: { type: Number, required: true },
    status: { type: String, enum: ['PROCESSING', 'PROCESSED'], default: 'PROCESSING' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)
TelegramProcessedUpdateSchema.index({ organizationId: 1, updateId: 1 }, { unique: true })
TelegramProcessedUpdateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const TelegramProcessedUpdate = mongoose.model(
  'TelegramProcessedUpdate',
  TelegramProcessedUpdateSchema
)

export const SmsCampaignSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    segment: { type: String, default: 'ALL' },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'TESTED', 'FAILED'],
      default: 'DRAFT',
    },
    scheduledAt: { type: Date },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    recipientCount: { type: Number, default: 0 },
    createdBy: { type: String },
  },
  { timestamps: true }
)

export const SmsCampaign = mongoose.model('SmsCampaign', SmsCampaignSchema)

export const SmsTemplateSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
)

export const SmsTemplate = mongoose.model('SmsTemplate', SmsTemplateSchema)

export const InAppNotificationSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    dedupeKey: { type: String },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    actionUrl: { type: String, default: '' },
    readAt: { type: Date },
    dismissedAt: { type: Date },
  },
  { timestamps: true }
)
InAppNotificationSchema.index(
  { organizationId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
)

export const InAppNotification = mongoose.model('InAppNotification', InAppNotificationSchema)

// 17. Booking Schema (Online & Telegram Appointments)
export const BookingSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    requestKey: { type: String },
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
      default: 'PENDING',
    },
    source: { type: String, enum: ['TELEGRAM', 'WEB', 'PHONE', 'WALK_IN'], default: 'TELEGRAM' },
    notes: { type: String },
  },
  { timestamps: true }
)
BookingSchema.index(
  { organizationId: 1, requestKey: 1 },
  { unique: true, partialFilterExpression: { requestKey: { $type: 'string' } } }
)

export const Booking = mongoose.model('Booking', BookingSchema)

export const TelegramServiceCatalogItemSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    price: { type: Number, min: 0 },
    currency: { type: String, trim: true, uppercase: true, maxlength: 8, default: 'UZS' },
    durationMinutes: { type: Number, min: 1, max: 1440 },
    branchIds: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)
TelegramServiceCatalogItemSchema.index({ organizationId: 1, name: 1 }, { unique: true })

export const TelegramServiceCatalogItem = mongoose.model(
  'TelegramServiceCatalogItem',
  TelegramServiceCatalogItemSchema
)

// 18. CameraSetting Schema (Automatic ANPR on service lane)
export const CameraSettingSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    branchId: { type: String, required: true },
    cameraName: { type: String, default: '1-Yo‘lak Kirish Kamerasi' },
    streamUrl: { type: String }, // RTSP, IP URL or USB Device
    autoANPR: { type: Boolean, default: true },
    actionOnDetect: {
      type: String,
      enum: ['OPEN_SERVICE', 'NOTIFY_MASTER', 'RECORD_ONLY'],
      default: 'OPEN_SERVICE',
    },
    isActive: { type: Boolean, default: true },
    minConfidence: { type: Number, default: 85 },
  },
  { timestamps: true }
)

export const CameraSetting = mongoose.model('CameraSetting', CameraSettingSchema)

// 19. AuditLog Schema
export const AuditLogSchema = new mongoose.Schema(
  {
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
    userAgent: { type: String },
  },
  { timestamps: true }
)
AuditLogSchema.index({ organizationId: 1, createdAt: -1 })
AuditLogSchema.index({ organizationId: 1, entity: 1, createdAt: -1 })

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema)

// 20. Transaction Schema (Payments: Click, Payme, Uzum, Uzcard, Humo, Cash, Terminal)
export const TransactionSchema = new mongoose.Schema(
  {
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
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PENDING', 'FAILED', 'CANCELLED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    transactionId: { type: String, index: true }, // External provider reference
    merchantTransactionId: { type: String, unique: true, sparse: true },
    payerPhone: { type: String },
    payerCardMasked: { type: String },
    paidAt: { type: Date },
    items: [
      {
        productId: { type: String },
        name: { type: String },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },
    ],
    notes: { type: String },
    receiptNumber: { type: String },
    createdByUserId: { type: String },
  },
  { timestamps: true }
)

export const Transaction = mongoose.model('Transaction', TransactionSchema)

export const SignupPaymentSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    organizationName: { type: String, required: true },
    phone: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    planName: { type: String, required: true },
    billingCycle: { type: String, enum: ['month', 'year'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'UZS' },
    provider: { type: String, enum: ['CLICK', 'PAYME'], required: true },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'PAID', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    merchantTransactionId: { type: String, required: true, unique: true },
    providerTransactionId: { type: String },
    paidAt: { type: Date },
    userId: { type: String },
    organizationId: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

export const SignupPayment = mongoose.model('SignupPayment', SignupPaymentSchema)

// 21. Invoice Schema (Customer Invoices & Billing)
export const InvoiceSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true },
    customerId: { type: String },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    vehiclePlate: { type: String },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, required: true },
        total: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'PAID', 'CANCELLED'],
      default: 'ISSUED',
    },
    paymentMethod: { type: String },
    paidAt: { type: Date },
    dueDate: { type: Date },
    issuedBy: { type: String },
  },
  { timestamps: true }
)

export const Invoice = mongoose.model('Invoice', InvoiceSchema)
