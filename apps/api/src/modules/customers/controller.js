import { Customer } from '../../models/index.js';
import { normalizePhoneE164 } from '../reminders/engine.js';
import { emitTenantEvent } from '../../realtime/socket.js';

export const getCustomers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const { search } = req.query;

    const filter = { organizationId: req.organizationId };
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { phoneE164: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    const [total, customers] = await Promise.all([
      Customer.countDocuments(filter),
      Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);

    res.json({
      success: true,
      data: customers,
      total,
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Mijoz topilmadi'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (err) {
    next(err);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const { fullName, phone, email, preferredLocale = 'uz' } = req.body;
    const rawPhone = phone || req.body.phoneE164;

    if (!fullName || !rawPhone) {
      return res.status(400).json({
        success: false,
        error: 'Ism va telefon raqami kiritilishi shart'
      });
    }

    const phoneE164 = normalizePhoneE164(rawPhone);

    const newCustomer = await Customer.create({
      organizationId: req.organizationId,
      fullName: fullName.trim(),
      phoneE164,
      email: email ? email.trim() : undefined,
      preferredLocale,
      smsConsentAt: new Date()
    });

    emitTenantEvent(req.organizationId, 'customer:created', newCustomer);

    res.status(201).json({
      success: true,
      data: newCustomer
    });
  } catch (err) {
    next(err);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates.organizationId; // Prevent changing tenant

    if (updates.phone) {
      updates.phoneE164 = normalizePhoneE164(updates.phone);
      delete updates.phone;
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { $set: updates },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Mijoz topilmadi'
      });
    }

    emitTenantEvent(req.organizationId, 'customer:updated', customer);

    res.json({
      success: true,
      data: customer
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Mijoz topilmadi'
      });
    }

    emitTenantEvent(req.organizationId, 'customer:deleted', { id: req.params.id });

    res.json({
      success: true,
      message: 'Mijoz o‘chirildi'
    });
  } catch (err) {
    next(err);
  }
};
