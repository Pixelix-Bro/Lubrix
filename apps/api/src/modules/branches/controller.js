import { Branch } from '../../models/index.js'
import { emitTenantEvent } from '../../realtime/socket.js'

export const getBranches = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50))
    const skip = (page - 1) * limit

    const filter = { organizationId: req.organizationId }
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' }
    }

    const [total, branches] = await Promise.all([
      Branch.countDocuments(filter),
      Branch.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ])

    res.json({
      success: true,
      data: branches,
      total,
      page,
      limit,
    })
  } catch (err) {
    next(err)
  }
}

export const getBranchById = async (req, res, next) => {
  try {
    const branch = await Branch.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    })

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Filial topilmadi',
      })
    }

    res.json({
      success: true,
      data: branch,
    })
  } catch (err) {
    next(err)
  }
}

export const createBranch = async (req, res, next) => {
  try {
    const { name, address, region, district, latitude, longitude, phone, workingHours } = req.body

    if (!name || !address) {
      return res.status(400).json({
        success: false,
        error: 'Filial nomi va manzili kiritilishi shart',
      })
    }

    const lat = latitude === undefined || latitude === '' ? undefined : Number(latitude)
    const lng = longitude === undefined || longitude === '' ? undefined : Number(longitude)
    if (
      (lat === undefined) !== (lng === undefined) ||
      (lat !== undefined &&
        (!Number.isFinite(lat) ||
          lat < -90 ||
          lat > 90 ||
          !Number.isFinite(lng) ||
          lng < -180 ||
          lng > 180))
    ) {
      return res.status(400).json({ success: false, error: 'Filial koordinatalari noto‘g‘ri' })
    }

    const newBranch = await Branch.create({
      organizationId: req.organizationId,
      name: name.trim(),
      address: address.trim(),
      region: region?.trim() || undefined,
      district: district?.trim() || undefined,
      latitude: lat,
      longitude: lng,
      phone: phone || '',
      workingHours: workingHours || '08:30 - 20:30',
      isActive: true,
    })

    emitTenantEvent(req.organizationId, 'branch:created', newBranch)

    res.status(201).json({
      success: true,
      data: newBranch,
    })
  } catch (err) {
    next(err)
  }
}

export const updateBranch = async (req, res, next) => {
  try {
    const updates = {}
    for (const field of [
      'name',
      'address',
      'region',
      'district',
      'phone',
      'workingHours',
      'isActive',
    ]) {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    }
    if (req.body.latitude !== undefined || req.body.longitude !== undefined) {
      const current = await Branch.findOne({
        _id: req.params.id,
        organizationId: req.organizationId,
      })
      if (!current) return res.status(404).json({ success: false, error: 'Filial topilmadi' })
      const lat = req.body.latitude === undefined ? current.latitude : Number(req.body.latitude)
      const lng = req.body.longitude === undefined ? current.longitude : Number(req.body.longitude)
      if (
        (lat === undefined) !== (lng === undefined) ||
        (lat !== undefined &&
          (!Number.isFinite(lat) ||
            lat < -90 ||
            lat > 90 ||
            !Number.isFinite(lng) ||
            lng < -180 ||
            lng > 180))
      ) {
        return res.status(400).json({ success: false, error: 'Filial koordinatalari noto‘g‘ri' })
      }
      updates.latitude = lat
      updates.longitude = lng
    }

    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { $set: updates },
      { new: true, runValidators: true }
    )

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Filial topilmadi',
      })
    }

    emitTenantEvent(req.organizationId, 'branch:updated', branch)

    res.json({
      success: true,
      data: branch,
    })
  } catch (err) {
    next(err)
  }
}

export const deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId,
    })

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Filial topilmadi',
      })
    }

    emitTenantEvent(req.organizationId, 'branch:deleted', { id: req.params.id })

    res.json({
      success: true,
      message: 'Filial o‘chirildi',
    })
  } catch (err) {
    next(err)
  }
}
