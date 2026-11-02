import {
  Customer,
  Inventory,
  Product,
  Reminder,
  ServiceRecord,
  StockMovement,
  Vehicle,
} from '../../models/index.js'
import { emitTenantEvent } from '../../realtime/socket.js'
import {
  calculateNextService,
  calculateReminderSchedules,
  generateReminderKey,
} from '../reminders/engine.js'
import { TelegramService } from '../telegram/telegramService.js'
import { litersToInventoryQuantity, parseOilQuantity } from './oilQuantity.js'

export const getServices = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20))
    const skip = (page - 1) * limit
    const { customerId, vehicleId, branchId, status, search, from, to } = req.query

    const filter = { organizationId: req.organizationId }
    if (customerId) filter.customerId = customerId
    if (vehicleId) filter.vehicleId = vehicleId
    if (branchId) filter.branchId = branchId
    if (status) filter.status = status

    const dateRange = {}
    const fromDate = from ? new Date(String(from)) : null
    const toDate = to ? new Date(String(to)) : null
    if ((from && Number.isNaN(fromDate.getTime())) || (to && Number.isNaN(toDate.getTime()))) {
      return res.status(400).json({ success: false, error: 'Sana oralig‘i noto‘g‘ri.' })
    }
    if (fromDate && toDate && fromDate >= toDate) {
      return res
        .status(400)
        .json({ success: false, error: 'Tugash sanasi boshlanish sanasidan keyin bo‘lishi kerak.' })
    }
    if (fromDate) dateRange.$gte = fromDate
    if (toDate) dateRange.$lt = toDate
    if (Object.keys(dateRange).length) filter.serviceDate = dateRange

    if (search && search.trim()) {
      const q = search.trim()
      filter.$or = [
        { customerName: { $regex: q, $options: 'i' } },
        { vehicle: { $regex: q, $options: 'i' } },
        { plate: { $regex: q, $options: 'i' } },
        { oilBrand: { $regex: q, $options: 'i' } },
      ]
    }

    const [total, services] = await Promise.all([
      ServiceRecord.countDocuments(filter),
      ServiceRecord.find(filter).sort({ serviceDate: -1, createdAt: -1 }).skip(skip).limit(limit),
    ])

    res.json({
      success: true,
      data: services,
      total,
      page,
      limit,
    })
  } catch (err) {
    next(err)
  }
}

export const getServiceStats = async (req, res, next) => {
  try {
    const orgId = req.organizationId
    const services = await ServiceRecord.find({ organizationId: orgId })

    const totalRevenue = services.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0)
    const completedServices = services.filter((s) => s.status === 'Tugallandi').length
    const averageTicket = services.length > 0 ? Math.round(totalRevenue / services.length) : 0

    res.json({
      success: true,
      data: {
        totalServices: services.length,
        completedServices,
        totalRevenue,
        averageTicket,
      },
    })
  } catch (err) {
    next(err)
  }
}

export const getServiceById = async (req, res, next) => {
  try {
    const service = await ServiceRecord.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    })

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Xizmat yozuvi topilmadi',
      })
    }

    res.json({
      success: true,
      data: service,
    })
  } catch (err) {
    next(err)
  }
}

export const createService = async (req, res, next) => {
  try {
    const {
      customerId,
      vehicleId,
      branchId = 'br-01',
      odometerKm,
      oilBrand,
      oilType,
      viscosity,
      oilQuantity,
      price = 0,
      intervalDays = 90,
      intervalKm = 7000,
      notes,
      serviceDate,
    } = req.body

    if (!customerId || !vehicleId || odometerKm === undefined) {
      return res.status(400).json({
        success: false,
        error: 'customerId, vehicleId va odometerKm kiritilishi shart',
      })
    }

    const parsedOilQuantity = parseOilQuantity(oilQuantity)
    if (parsedOilQuantity === null) {
      return res.status(400).json({
        success: false,
        error: 'Ishlatilgan moy miqdori musbat litr qiymatida kiritilishi shart',
      })
    }

    const [customer, vehicle] = await Promise.all([
      Customer.findOne({ _id: customerId, organizationId: req.organizationId }),
      Vehicle.findOne({ _id: vehicleId, organizationId: req.organizationId }),
    ])

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Mijoz topilmadi' })
    }
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Avtomobil topilmadi' })
    }

    const odoNum = Number(odometerKm) || 0

    const calc = calculateNextService({
      serviceDate: serviceDate || new Date(),
      odometerKm: odoNum,
      intervalDays: Number(intervalDays) || 90,
      intervalKm: Number(intervalKm) || 7000,
    })

    const escapedBrand = String(oilBrand || 'Lubrix Oil').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const escapedViscosity = String(viscosity || '5W-40').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const matchingProduct = await Product.findOne({
      organizationId: req.organizationId,
      brand: { $regex: new RegExp(`^${escapedBrand}$`, 'i') },
      viscosity: { $regex: new RegExp(`^${escapedViscosity}$`, 'i') },
      isArchived: { $ne: true },
    })
    if (!matchingProduct) {
      return res.status(409).json({
        success: false,
        error: 'Ushbu moy markasi va viskoziteti uchun tashkilot omborida mahsulot topilmadi',
      })
    }

    const inventoryItem = await Inventory.findOne({
      organizationId: req.organizationId,
      branchId,
      productId: matchingProduct._id.toString(),
    })
    const stockQuantity = inventoryItem
      ? litersToInventoryQuantity(parsedOilQuantity, inventoryItem.unit)
      : null
    if (stockQuantity === null) {
      return res.status(409).json({
        success: false,
        error: inventoryItem
          ? 'Moy mahsuloti ombor birligi litr yoki millilitr bo‘lishi kerak'
          : 'Tanlangan filial omborida ushbu moy mavjud emas',
      })
    }

    const reservedInventory = await Inventory.findOneAndUpdate(
      {
        _id: inventoryItem._id,
        organizationId: req.organizationId,
        branchId,
        productId: matchingProduct._id.toString(),
        quantity: { $gte: stockQuantity },
      },
      { $inc: { quantity: -stockQuantity } },
      { new: false }
    )
    if (!reservedInventory) {
      return res.status(409).json({
        success: false,
        error: 'Filial omborida ushbu moy uchun yetarli qoldiq mavjud emas',
      })
    }

    const quantityAfter = reservedInventory.quantity - stockQuantity
    let newService
    try {
      newService = await ServiceRecord.create({
        organizationId: req.organizationId,
        branchId,
        vehicleId,
        customerId,
        customerName: customer.fullName,
        vehicle: `${vehicle.make} ${vehicle.model}`.trim(),
        plate: vehicle.plateNumber,
        serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
        odometerKm: odoNum,
        oilBrand: oilBrand || 'Lubrix Oil',
        oilType: oilType || 'Synthetic',
        viscosity: viscosity || '5W-40',
        oilQuantity: parsedOilQuantity,
        price: Number(price) || 0,
        nextDueDate: calc.nextDueDate,
        nextDueKm: calc.nextDueKm,
        status: 'Tugallandi',
        notes: notes || '',
      })
      res.locals.auditEntityId = newService._id.toString()

      await StockMovement.create({
        organizationId: req.organizationId,
        branchId,
        productId: matchingProduct._id.toString(),
        type: 'SERVICE_CONSUMPTION',
        quantityBefore: reservedInventory.quantity,
        quantityChanged: -stockQuantity,
        quantityAfter,
        reason: `Xizmat (#${newService._id}) sarfiyati`,
        userName: req.user?.name || 'Staff',
      })
    } catch (error) {
      await Inventory.updateOne(
        {
          _id: reservedInventory._id,
          organizationId: req.organizationId,
          branchId,
          productId: matchingProduct._id.toString(),
        },
        { $inc: { quantity: stockQuantity } }
      ).catch(() => {})
      if (newService) {
        await ServiceRecord.deleteOne({
          _id: newService._id,
          organizationId: req.organizationId,
        }).catch(() => {})
      }
      throw error
    }

    if (odoNum > (vehicle.currentOdometerKm || 0)) {
      vehicle.currentOdometerKm = odoNum
      await vehicle.save()
    }
    if (
      reservedInventory.quantity > reservedInventory.minStockLevel &&
      quantityAfter <= reservedInventory.minStockLevel
    ) {
      await TelegramService.notifyOwner(req.organizationId, 'lowStock', {
        productName: matchingProduct.name,
        quantity: quantityAfter,
      })
    }

    // Cancel older scheduled reminders for this vehicle
    await Reminder.updateMany(
      { organizationId: req.organizationId, vehicleId, status: 'scheduled' },
      { $set: { status: 'cancelled' } }
    )

    // Schedule new reminder tasks
    const reminderSchedule = calculateReminderSchedules(calc.nextDueDate)
    for (const sched of reminderSchedule) {
      const idKey = generateReminderKey({
        organizationId: req.organizationId,
        serviceRecordId: newService._id.toString(),
        vehicleId,
        eventType: sched.eventType,
      })

      try {
        await Reminder.create({
          organizationId: req.organizationId,
          serviceRecordId: newService._id.toString(),
          vehicleId,
          customerId,
          customerName: customer.fullName,
          vehicleLabel: `${vehicle.make} ${vehicle.model} · ${vehicle.plateNumber}`,
          channel: 'SMS',
          dueAt: sched.dueAt,
          status: 'scheduled',
          idempotencyKey: idKey,
          attempts: 0,
        })
      } catch (remErr) {
        // Ignore duplicate key error for idempotency
        if (!remErr.message?.includes('duplicate key')) {
          console.warn('[LUBRIX] Reminder scheduling warning:', remErr.message)
        }
      }
    }

    emitTenantEvent(req.organizationId, 'service:created', newService)
    emitTenantEvent(req.organizationId, 'dashboard:updated', { service: newService })
    await TelegramService.notifyOwner(req.organizationId, 'serviceCompleted', {
      customerName: newService.customerName,
      vehicle: newService.vehicle,
      plate: newService.plate,
      price: newService.price,
    })

    res.status(201).json({
      success: true,
      data: newService,
    })
  } catch (err) {
    next(err)
  }
}

export const updateService = async (req, res, next) => {
  try {
    const updates = { ...req.body }
    delete updates.organizationId

    const service = await ServiceRecord.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { $set: updates },
      { new: true }
    )

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Xizmat topilmadi',
      })
    }

    emitTenantEvent(req.organizationId, 'service:updated', service)

    res.json({
      success: true,
      data: service,
    })
  } catch (err) {
    next(err)
  }
}

export const deleteService = async (req, res, next) => {
  try {
    const service = await ServiceRecord.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId,
    })

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Xizmat topilmadi',
      })
    }

    emitTenantEvent(req.organizationId, 'service:deleted', { id: req.params.id })

    res.json({
      success: true,
      message: 'Xizmat o‘chirildi',
    })
  } catch (err) {
    next(err)
  }
}
