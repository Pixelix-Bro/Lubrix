import { AuditLog, Customer, InspectionReport, Vehicle } from '../../models/index.js'
import { emitTenantEvent } from '../../realtime/socket.js'
import { validateInspectionPayload } from './inspectionConfig.js'

const summarizeStatus = (points) => {
  if (points.some((point) => point.status === 'CRITICAL')) return 'CRITICAL'
  if (points.some((point) => point.status === 'ATTENTION')) return 'ATTENTION'
  if (points.every((point) => point.status === 'GOOD')) return 'GOOD'
  return 'NOT_CHECKED'
}

export const createInspection = async (req, res, next) => {
  try {
    const validationError = validateInspectionPayload(req.body)
    if (validationError) return res.status(400).json({ success: false, error: validationError })

    const [customer, vehicle] = await Promise.all([
      Customer.findOne({ _id: req.body.customerId, organizationId: req.organizationId }).select(
        '_id fullName'
      ),
      Vehicle.findOne({
        _id: req.body.vehicleId,
        customerId: req.body.customerId,
        organizationId: req.organizationId,
      }).select('_id plateNumber make model'),
    ])
    if (!customer) return res.status(404).json({ success: false, error: 'Mijoz topilmadi' })
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, error: 'Avtomobil ushbu mijozga tegishli emas' })
    }

    const report = await InspectionReport.create({
      organizationId: req.organizationId,
      customerId: customer._id.toString(),
      customerName: customer.fullName,
      vehicleId: vehicle._id.toString(),
      vehiclePlate: vehicle.plateNumber,
      vehicleLabel: `${vehicle.make || ''} ${vehicle.model || ''}`.trim(),
      branchId: req.user.branchId || '',
      technicianId: req.userId,
      technicianName: req.user.name,
      odometerKm: Number(req.body.odometerKm),
      inspectedAt: new Date(),
      points: req.body.points.map((point) => ({
        key: point.key,
        status: point.status,
        note: String(point.note || '').trim(),
        recommendation: String(point.recommendation || '').trim(),
        imageUrl: '',
      })),
      overallStatus: summarizeStatus(req.body.points),
      notes: String(req.body.notes || '').trim(),
      status: req.body.points.every((point) => point.status !== 'NOT_CHECKED')
        ? 'COMPLETED'
        : 'DRAFT',
    })

    emitTenantEvent(req.organizationId, 'inspection:created', report)
    return res.status(201).json({ success: true, data: report })
  } catch (error) {
    return next(error)
  }
}

export const listInspections = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 20))
    const filter = { organizationId: req.organizationId, status: { $ne: 'CANCELLED' } }
    if (req.query.customerId) filter.customerId = String(req.query.customerId)
    if (req.query.vehicleId) filter.vehicleId = String(req.query.vehicleId)

    const [total, reports] = await Promise.all([
      InspectionReport.countDocuments(filter),
      InspectionReport.find(filter)
        .sort({ inspectedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ])
    return res.json({ success: true, data: reports, total, page, limit })
  } catch (error) {
    return next(error)
  }
}

export const getInspection = async (req, res, next) => {
  try {
    const report = await InspectionReport.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    })
    if (!report) return res.status(404).json({ success: false, error: 'Ko‘rik topilmadi' })
    return res.json({ success: true, data: report })
  } catch (error) {
    return next(error)
  }
}

export const updateInspection = async (req, res, next) => {
  try {
    const validationError = validateInspectionPayload(req.body)
    if (validationError) return res.status(400).json({ success: false, error: validationError })

    const report = await InspectionReport.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    })
    if (!report) return res.status(404).json({ success: false, error: 'Ko‘rik topilmadi' })
    if (report.status === 'CANCELLED') {
      return res
        .status(409)
        .json({ success: false, error: 'Bekor qilingan ko‘rikni tahrirlab bo‘lmaydi' })
    }

    const [customer, vehicle] = await Promise.all([
      Customer.findOne({ _id: req.body.customerId, organizationId: req.organizationId }).select(
        '_id fullName'
      ),
      Vehicle.findOne({
        _id: req.body.vehicleId,
        customerId: req.body.customerId,
        organizationId: req.organizationId,
      }).select('_id plateNumber make model'),
    ])
    if (!customer) return res.status(404).json({ success: false, error: 'Mijoz topilmadi' })
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, error: 'Avtomobil ushbu mijozga tegishli emas' })
    }

    const previousStatus = report.overallStatus
    report.customerId = customer._id.toString()
    report.customerName = customer.fullName
    report.vehicleId = vehicle._id.toString()
    report.vehiclePlate = vehicle.plateNumber
    report.vehicleLabel = `${vehicle.make || ''} ${vehicle.model || ''}`.trim()
    report.odometerKm = Number(req.body.odometerKm)
    const existingImageUrls = new Map(report.points.map((point) => [point.key, point.imageUrl]))
    report.points = req.body.points.map((point) => ({
      key: point.key,
      status: point.status,
      note: String(point.note || '').trim(),
      recommendation: String(point.recommendation || '').trim(),
      imageUrl: existingImageUrls.get(point.key) || '',
    }))
    report.overallStatus = summarizeStatus(req.body.points)
    report.notes = String(req.body.notes || '').trim()
    report.status = req.body.points.every((point) => point.status !== 'NOT_CHECKED')
      ? 'COMPLETED'
      : 'DRAFT'
    await report.save()

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.userId,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'TECHNICAL_INSPECTION',
      entityId: report._id.toString(),
      details: `Ko‘rik yangilandi; oldingi holat: ${previousStatus}, yangi holat: ${report.overallStatus}`,
    })
    emitTenantEvent(req.organizationId, 'inspection:updated', report)
    return res.json({ success: true, data: report })
  } catch (error) {
    return next(error)
  }
}

export const cancelInspection = async (req, res, next) => {
  try {
    const report = await InspectionReport.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId: req.organizationId,
        status: { $ne: 'CANCELLED' },
      },
      { $set: { status: 'CANCELLED' } },
      { new: true, runValidators: true }
    )
    if (!report) return res.status(404).json({ success: false, error: 'Faol ko‘rik topilmadi' })

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.userId,
      userName: req.user.name,
      action: 'CANCEL',
      entity: 'TECHNICAL_INSPECTION',
      entityId: report._id.toString(),
      details: `Ko‘rik bekor qilindi: ${report.vehiclePlate}`,
    })
    emitTenantEvent(req.organizationId, 'inspection:cancelled', report)
    return res.json({ success: true, data: report })
  } catch (error) {
    return next(error)
  }
}
