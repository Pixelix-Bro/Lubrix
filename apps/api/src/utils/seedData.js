import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import {
  Branch,
  Customer,
  Inventory,
  Organization,
  Product,
  PurchaseOrder,
  Reminder,
  ServiceRecord,
  Supplier,
  User,
  Vehicle,
} from '../models/index.js'

export const seedData = async () => {
  console.log('[LUBRIX SEED] Starting database seeding...')

  // 1. Organization
  let org = await Organization.findOne({ slug: 'lubrix-uz' })
  if (!org) {
    org = await Organization.create({
      name: 'Lubrix Oil Service',
      slug: 'lubrix-uz',
      countryCode: 'UZ',
      currency: 'UZS',
      timezone: 'Asia/Tashkent',
      defaultLocale: 'uz',
      status: 'active',
      settings: {
        smsSender: '4546',
        smsTemplates: {
          dueSoon:
            'Assalomu alaykum {customer_name}. {vehicle} uchun moy almashtirish vaqti {due_date}. Lubrix Servis',
          overdue:
            'Hurmatli {customer_name}, {vehicle} avtomobilingiz moy almashtirish muddati yetdi. Lubrix filiallariga marhamat!',
        },
        autoReminders: true,
        telegramBotActive: true,
        workingDays: 'Dushanba - Shanba',
      },
    })
    console.log('[LUBRIX SEED] Created Organization:', org.name)
  }
  const orgId = org._id.toString()

  // 2. Branches
  let branch1 = await Branch.findOne({ organizationId: orgId, name: /Chilonzor/i })
  if (!branch1) {
    branch1 = await Branch.create({
      organizationId: orgId,
      name: 'Lubrix Chilonzor filiali',
      address: "Toshkent sh., Chilonzor tumani, Bunyodkor shoh ko'chasi 42",
      latitude: 41.2783,
      longitude: 69.2045,
      phone: '+998712001122',
      workingHours: '08:30 - 20:30',
      isActive: true,
    })
  }

  const branch2 = await Branch.findOne({ organizationId: orgId, name: /Yunusobod/i })
  if (!branch2) {
    await Branch.create({
      organizationId: orgId,
      name: 'Lubrix Yunusobod filiali',
      address: "Toshkent sh., Yunusobod tumani, Amir Temur ko'chasi 118",
      latitude: 41.3654,
      longitude: 69.2891,
      phone: '+998712003344',
      workingHours: '09:00 - 21:00',
      isActive: true,
    })
  }

  // 3. Users
  const adminEmail = 'admin@lubrix.uz'
  let admin = await User.findOne({ email: adminEmail })
  if (!admin) {
    const adminHash = await bcrypt.hash('Admin1234!', 12)
    admin = await User.create({
      organizationId: orgId,
      name: 'Rustam Qosimov',
      email: adminEmail,
      passwordHash: adminHash,
      role: 'OWNER',
      branchId: branch1._id.toString(),
      phone: '+998901112233',
      isActive: true,
    })
    console.log('[LUBRIX SEED] Created Admin user:', admin.email)
  }

  // Demo user: test1@gmail.com / test1
  const demoEmail = 'test1@gmail.com'
  let demoUser = await User.findOne({ email: demoEmail })
  if (!demoUser) {
    const demoHash = await bcrypt.hash('test1', 12)
    demoUser = await User.create({
      organizationId: orgId,
      name: 'Demo Foydalanuvchi',
      email: demoEmail,
      passwordHash: demoHash,
      role: 'OWNER',
      branchId: branch1._id.toString(),
      phone: '+998901230000',
      isActive: true,
    })
    console.log('[LUBRIX SEED] Created Demo user:', demoUser.email)
  } else {
    // Ensure password is test1
    demoUser.passwordHash = await bcrypt.hash('test1', 12)
    demoUser.isActive = true
    await demoUser.save()
  }

  const staffEmail = 'jasur@lubrix.uz'
  let staff = await User.findOne({ email: staffEmail })
  if (!staff) {
    const staffHash = await bcrypt.hash('Jasur1234!', 12)
    staff = await User.create({
      organizationId: orgId,
      name: 'Jasur Usta',
      email: staffEmail,
      passwordHash: staffHash,
      role: 'STAFF',
      branchId: branch1._id.toString(),
      phone: '+998934445566',
      isActive: true,
    })
    console.log('[LUBRIX SEED] Created Staff user:', staff.email)
  }

  // 4. Customers
  let cust1 = await Customer.findOne({ organizationId: orgId, phoneE164: '+998901234567' })
  if (!cust1) {
    cust1 = await Customer.create({
      organizationId: orgId,
      fullName: 'Azizbek Karimov',
      phoneE164: '+998901234567',
      email: 'azizbek@example.com',
      preferredLocale: 'uz',
      smsConsentAt: new Date(),
    })
  }

  let cust2 = await Customer.findOne({ organizationId: orgId, phoneE164: '+998939876543' })
  if (!cust2) {
    cust2 = await Customer.create({
      organizationId: orgId,
      fullName: 'Madina Rasulova',
      phoneE164: '+998939876543',
      email: 'madina@example.com',
      preferredLocale: 'uz',
      smsConsentAt: new Date(),
    })
  }

  // 5. Vehicles
  let veh1 = await Vehicle.findOne({ organizationId: orgId, plateNumber: '01 A 777 AA' })
  if (!veh1) {
    veh1 = await Vehicle.create({
      organizationId: orgId,
      customerId: cust1._id.toString(),
      plateNumber: '01 A 777 AA',
      plateCountry: 'UZ',
      make: 'Chevrolet',
      model: 'Malibu 2',
      modelYear: 2022,
      currentOdometerKm: 45000,
    })
  }

  const veh2 = await Vehicle.findOne({ organizationId: orgId, plateNumber: '01 B 432 BB' })
  if (!veh2) {
    await Vehicle.create({
      organizationId: orgId,
      customerId: cust2._id.toString(),
      plateNumber: '01 B 432 BB',
      plateCountry: 'UZ',
      make: 'Kia',
      model: 'K5',
      modelYear: 2023,
      currentOdometerKm: 28000,
    })
  }

  // 6. Products
  const productsToSeed = [
    {
      name: 'Castrol EDGE 5W-30 LL',
      brand: 'Castrol',
      category: 'Engine Oil',
      oilType: 'Synthetic',
      viscosity: '5W-30',
      barcode: '4008177073281',
      standards: ['API SP', 'ACEA C3', 'MB 229.51', 'BMW LL-04'],
      packageSizes: ['1L', '4L', '5L', '60L', '208L'],
      description: 'Titanium FST texnologiyali yuqori unumdor sintetik motor moyi.',
    },
    {
      name: 'Shell Helix Ultra 5W-40',
      brand: 'Shell',
      category: 'Engine Oil',
      oilType: 'Synthetic',
      viscosity: '5W-40',
      barcode: '5011987249454',
      standards: ['API SP', 'ACEA A3/B4', 'VW 502.00'],
      packageSizes: ['1L', '4L', '209L'],
      description: "PurePlus gazdan suyuqlik texnologiyasi bilan tayyorlangan to'liq sintetik moy.",
    },
    {
      name: 'Motul 8100 X-cess Gen2 5W-40',
      brand: 'Motul',
      category: 'Engine Oil',
      oilType: 'Synthetic',
      viscosity: '5W-40',
      barcode: '3374650293021',
      standards: ['API SN/CF', 'ACEA A3/B4', 'Porsche A40'],
      packageSizes: ['1L', '5L', '60L'],
      description: 'Benzin va dizel dvigatellari uchun 100% sintetik motor moyi.',
    },
    {
      name: 'Mann Filter W 68/3',
      brand: 'Mann-Filter',
      category: 'Oil Filter',
      oilType: 'Filter',
      viscosity: '-',
      barcode: '4011558717109',
      standards: ['OEM Quality'],
      packageSizes: ['1 dona'],
      description: 'Premium moy tozalash filtri.',
    },
  ]

  const seededProducts = []
  for (const p of productsToSeed) {
    let prod = await Product.findOne({ barcode: p.barcode })
    if (!prod) {
      prod = await Product.create({ ...p, organizationId: orgId })
    }
    seededProducts.push(prod)
  }

  // 7. Inventory
  if (seededProducts[0] && branch1) {
    const inv1 = await Inventory.findOne({
      organizationId: orgId,
      branchId: branch1._id.toString(),
      productId: seededProducts[0]._id.toString(),
    })
    if (!inv1) {
      await Inventory.create({
        organizationId: orgId,
        branchId: branch1._id.toString(),
        productId: seededProducts[0]._id.toString(),
        quantity: 48,
        unit: 'L',
        purchasePrice: 110000,
        sellingPrice: 155000,
        minStockLevel: 20,
        location: 'A-01-B2',
      })
    }
  }

  if (seededProducts[1] && branch1) {
    const inv2 = await Inventory.findOne({
      organizationId: orgId,
      branchId: branch1._id.toString(),
      productId: seededProducts[1]._id.toString(),
    })
    if (!inv2) {
      await Inventory.create({
        organizationId: orgId,
        branchId: branch1._id.toString(),
        productId: seededProducts[1]._id.toString(),
        quantity: 14,
        unit: 'L',
        purchasePrice: 95000,
        sellingPrice: 135000,
        minStockLevel: 25,
        location: 'A-01-B3',
      })
    }
  }

  // 8. Services
  let srv1 = await ServiceRecord.findOne({ organizationId: orgId, plate: '01 A 777 AA' })
  if (!srv1) {
    srv1 = await ServiceRecord.create({
      organizationId: orgId,
      branchId: branch1._id.toString(),
      vehicleId: veh1._id.toString(),
      customerId: cust1._id.toString(),
      customerName: 'Azizbek Karimov',
      vehicle: 'Chevrolet Malibu 2',
      plate: '01 A 777 AA',
      serviceDate: new Date(),
      odometerKm: 45000,
      oilBrand: 'Castrol',
      oilType: 'EDGE Fully Synthetic',
      viscosity: '5W-30',
      oilQuantity: 4.5,
      price: 850000,
      nextDueDate: new Date(Date.now() + 90 * 24 * 3600 * 1000),
      nextDueKm: 52000,
      status: 'Tugallandi',
      notes: 'Filtrlar bilan almashtirildi.',
    })
  }

  // 9. Reminders
  const rem1 = await Reminder.findOne({ organizationId: orgId, vehicleId: veh1._id.toString() })
  if (!rem1) {
    await Reminder.create({
      organizationId: orgId,
      serviceRecordId: srv1._id.toString(),
      vehicleId: veh1._id.toString(),
      customerId: cust1._id.toString(),
      customerName: 'Azizbek Karimov',
      vehicleLabel: 'Chevrolet Malibu 2 · 01 A 777 AA',
      channel: 'SMS',
      dueAt: new Date(Date.now() + 75 * 24 * 3600 * 1000),
      status: 'scheduled',
      idempotencyKey: `lubrix:reminder:${orgId}:${srv1._id}:REMINDER_14_DAYS`,
      attempts: 0,
    })
  }

  // 10. Suppliers & Purchases
  let sup1 = await Supplier.findOne({ organizationId: orgId, name: /LubriGroup/i })
  if (!sup1) {
    sup1 = await Supplier.create({
      organizationId: orgId,
      name: 'LubriGroup Central Asia MCHJ',
      contactPerson: 'Rustam Aliyev',
      phone: '+998901112233',
      email: 'sales@lubrigroup.uz',
      address: 'Toshkent sh., Sergeli sanoat zonasi 12',
      brands: ['Castrol', 'BP'],
      rating: 4.9,
      balance: 14500000,
    })
  }

  let po1 = await PurchaseOrder.findOne({ organizationId: orgId, poNumber: 'PO-2026-001' })
  if (!po1) {
    await PurchaseOrder.create({
      poNumber: 'PO-2026-001',
      organizationId: orgId,
      supplierId: sup1._id.toString(),
      supplierName: sup1.name,
      branchId: branch1._id.toString(),
      totalAmount: 18500000,
      status: 'COMPLETED',
      itemsCount: 3,
    })
  }

  console.log('[LUBRIX SEED] Database seeding finished successfully.')
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('seedData.js')) {
  ;(async () => {
    await connectDB()
    await seedData()
    await mongoose.connection.close()
    process.exit(0)
  })()
}
