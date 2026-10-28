import { Vehicle, Customer } from '../../models/index.js';
import { emitTenantEvent } from '../../realtime/socket.js';

export const getVehicles = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const { customerId, search } = req.query;

    const filter = { organizationId: req.organizationId };
    if (customerId) {
      filter.customerId = customerId;
    }
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { plateNumber: { $regex: q, $options: 'i' } },
        { make: { $regex: q, $options: 'i' } },
        { model: { $regex: q, $options: 'i' } },
        { vin: { $regex: q, $options: 'i' } }
      ];
    }

    const [total, vehicles] = await Promise.all([
      Vehicle.countDocuments(filter),
      Vehicle.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);

    res.json({
      success: true,
      data: vehicles,
      total,
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
};

export const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Avtomobil topilmadi'
      });
    }

    res.json({
      success: true,
      data: vehicle
    });
  } catch (err) {
    next(err);
  }
};

export const createVehicle = async (req, res, next) => {
  try {
    const { customerId, plateNumber, plateCountry = 'UZ', make, model, modelYear, vin, currentOdometerKm } = req.body;

    if (!customerId || !plateNumber) {
      return res.status(400).json({
        success: false,
        error: 'customerId va plateNumber kiritilishi shart'
      });
    }

    const customer = await Customer.findOne({ _id: customerId, organizationId: req.organizationId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Mijoz topilmadi'
      });
    }

    const newVehicle = await Vehicle.create({
      organizationId: req.organizationId,
      customerId,
      plateNumber: plateNumber.toUpperCase().trim(),
      plateCountry,
      make: make || 'Noma‘lum',
      model: model || 'Noma‘lum',
      modelYear: Number(modelYear) || undefined,
      vin: vin ? vin.toUpperCase().trim() : undefined,
      currentOdometerKm: Number(currentOdometerKm) || 0
    });

    emitTenantEvent(req.organizationId, 'vehicle:created', newVehicle);

    res.status(201).json({
      success: true,
      data: newVehicle
    });
  } catch (err) {
    next(err);
  }
};

export const updateVehicle = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates.organizationId;

    if (updates.plateNumber) {
      updates.plateNumber = updates.plateNumber.toUpperCase().trim();
    }
    if (updates.vin) {
      updates.vin = updates.vin.toUpperCase().trim();
    }

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { $set: updates },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Avtomobil topilmadi'
      });
    }

    emitTenantEvent(req.organizationId, 'vehicle:updated', vehicle);

    res.json({
      success: true,
      data: vehicle
    });
  } catch (err) {
    next(err);
  }
};

export const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Avtomobil topilmadi'
      });
    }

    emitTenantEvent(req.organizationId, 'vehicle:deleted', { id: req.params.id });

    res.json({
      success: true,
      message: 'Avtomobil o‘chirildi'
    });
  } catch (err) {
    next(err);
  }
};
