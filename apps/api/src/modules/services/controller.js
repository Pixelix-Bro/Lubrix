import { ServiceRecord, Customer, Vehicle, Product, Inventory, StockMovement, Reminder } from '../../models/index.js';
import { calculateNextService, calculateReminderSchedules, generateReminderKey } from '../reminders/engine.js';
import { emitTenantEvent } from '../../realtime/socket.js';

export const getServices = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const { customerId, vehicleId, branchId, status, search } = req.query;

    const filter = { organizationId: req.organizationId };
    if (customerId) filter.customerId = customerId;
    if (vehicleId) filter.vehicleId = vehicleId;
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { customerName: { $regex: q, $options: 'i' } },
        { vehicle: { $regex: q, $options: 'i' } },
        { plate: { $regex: q, $options: 'i' } },
        { oilBrand: { $regex: q, $options: 'i' } }
      ];
    }

    const [total, services] = await Promise.all([
      ServiceRecord.countDocuments(filter),
      ServiceRecord.find(filter).sort({ serviceDate: -1, createdAt: -1 }).skip(skip).limit(limit)
    ]);

    res.json({
      success: true,
      data: services,
      total,
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
};

export const getServiceStats = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const services = await ServiceRecord.find({ organizationId: orgId });

    const totalRevenue = services.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
    const completedServices = services.filter(s => s.status === 'Tugallandi').length;
    const averageTicket = services.length > 0 ? Math.round(totalRevenue / services.length) : 0;

    res.json({
      success: true,
      data: {
        totalServices: services.length,
        completedServices,
        totalRevenue,
        averageTicket
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getServiceById = async (req, res, next) => {
  try {
    const service = await ServiceRecord.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Xizmat yozuvi topilmadi'
      });
    }

    res.json({
      success: true,
      data: service
    });
  } catch (err) {
    next(err);
  }
};

export const createService = async (req, res, next) => {
  try {
    const {
      customerId,
      vehicleId,
      branchId = "br-01",
      odometerKm,
      oilBrand,
      oilType,
      viscosity,
      oilQuantity = 4,
      price = 0,
      intervalDays = 90,
      intervalKm = 7000,
      notes,
      serviceDate
    } = req.body;

    if (!customerId || !vehicleId || odometerKm === undefined) {
      return res.status(400).json({
        success: false,
        error: 'customerId, vehicleId va odometerKm kiritilishi shart'
      });
    }

    const [customer, vehicle] = await Promise.all([
      Customer.findOne({ _id: customerId, organizationId: req.organizationId }),
      Vehicle.findOne({ _id: vehicleId, organizationId: req.organizationId })
    ]);

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Mijoz topilmadi' });
    }
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Avtomobil topilmadi' });
    }

    const odoNum = Number(odometerKm) || 0;
    if (odoNum > (vehicle.currentOdometerKm || 0)) {
      vehicle.currentOdometerKm = odoNum;
      await vehicle.save();
    }

    const calc = calculateNextService({
      serviceDate: serviceDate || new Date(),
      odometerKm: odoNum,
      intervalDays: Number(intervalDays) || 90,
      intervalKm: Number(intervalKm) || 7000
    });

    const newService = await ServiceRecord.create({
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
      oilQuantity: Number(oilQuantity) || 4,
      price: Number(price) || 0,
      nextDueDate: calc.nextDueDate,
      nextDueKm: calc.nextDueKm,
      status: "Tugallandi",
      notes: notes || ''
    });

    // Stock auto-deduction if matching product found
    try {
      if (oilBrand) {
        const matchingProduct = await Product.findOne({
          $or: [
            { organizationId: req.organizationId, brand: { $regex: new RegExp(`^${oilBrand}$`, 'i') } },
            { brand: { $regex: new RegExp(`^${oilBrand}$`, 'i') } }
          ]
        });

        if (matchingProduct) {
          const invItem = await Inventory.findOne({
            organizationId: req.organizationId,
            productId: matchingProduct._id.toString(),
            branchId
          });

          if (invItem && invItem.quantity >= Number(oilQuantity)) {
            const qtyBefore = invItem.quantity;
            invItem.quantity -= Number(oilQuantity);
            await invItem.save();

            await StockMovement.create({
              organizationId: req.organizationId,
              branchId,
              productId: matchingProduct._id.toString(),
              type: 'SERVICE_CONSUMPTION',
              quantityBefore: qtyBefore,
              quantityChanged: -Number(oilQuantity),
              quantityAfter: invItem.quantity,
              reason: `Xizmat (#${newService._id}) sarfiyati`,
              userName: req.user?.name || 'Staff'
            });
          }
        }
      }
    } catch (stockErr) {
      console.warn('[LUBRIX] Stock deduction warning:', stockErr.message);
    }

    // Cancel older scheduled reminders for this vehicle
    await Reminder.updateMany(
      { organizationId: req.organizationId, vehicleId, status: 'scheduled' },
      { $set: { status: 'cancelled' } }
    );

    // Schedule new reminder tasks
    const reminderSchedule = calculateReminderSchedules(calc.nextDueDate);
    for (const sched of reminderSchedule) {
      const idKey = generateReminderKey({
        organizationId: req.organizationId,
        serviceRecordId: newService._id.toString(),
        vehicleId,
        eventType: sched.eventType
      });

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
          attempts: 0
        });
      } catch (remErr) {
        // Ignore duplicate key error for idempotency
        if (!remErr.message?.includes('duplicate key')) {
          console.warn('[LUBRIX] Reminder scheduling warning:', remErr.message);
        }
      }
    }

    emitTenantEvent(req.organizationId, 'service:created', newService);
    emitTenantEvent(req.organizationId, 'dashboard:updated', { service: newService });

    res.status(201).json({
      success: true,
      data: newService
    });
  } catch (err) {
    next(err);
  }
};

export const updateService = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates.organizationId;

    const service = await ServiceRecord.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { $set: updates },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Xizmat topilmadi'
      });
    }

    emitTenantEvent(req.organizationId, 'service:updated', service);

    res.json({
      success: true,
      data: service
    });
  } catch (err) {
    next(err);
  }
};

export const deleteService = async (req, res, next) => {
  try {
    const service = await ServiceRecord.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Xizmat topilmadi'
      });
    }

    emitTenantEvent(req.organizationId, 'service:deleted', { id: req.params.id });

    res.json({
      success: true,
      message: 'Xizmat o‘chirildi'
    });
  } catch (err) {
    next(err);
  }
};
