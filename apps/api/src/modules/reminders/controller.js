import { Reminder, Customer, MessageLog, Organization } from '../../models/index.js';
import { getSmsProvider } from '../notifications/smsAdapter.js';
import { emitTenantEvent } from '../../realtime/socket.js';

export const getReminders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const { status, vehicleId, customerId } = req.query;

    const filter = { organizationId: req.organizationId };
    if (status) filter.status = status;
    if (vehicleId) filter.vehicleId = vehicleId;
    if (customerId) filter.customerId = customerId;

    const [total, reminders] = await Promise.all([
      Reminder.countDocuments(filter),
      Reminder.find(filter).sort({ dueAt: 1 }).skip(skip).limit(limit)
    ]);

    res.json({
      success: true,
      data: reminders,
      total,
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
};

export const getReminderById = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Eslatma topilmadi'
      });
    }

    res.json({
      success: true,
      data: reminder
    });
  } catch (err) {
    next(err);
  }
};

export const sendReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reminder = await Reminder.findOne({
      _id: id,
      organizationId: req.organizationId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Eslatma topilmadi'
      });
    }

    const [customer, org] = await Promise.all([
      Customer.findOne({ _id: reminder.customerId, organizationId: req.organizationId }),
      Organization.findById(req.organizationId)
    ]);

    const recipientPhone = customer?.phoneE164 || '+998901234567';
    const customerName = customer?.fullName || reminder.customerName || 'Hurmatli mijoz';
    const vehicleLabel = reminder.vehicleLabel || 'Avtomobilingiz';
    const orgName = org?.name || 'Lubrix Servis';

    const smsProvider = getSmsProvider();
    const smsText = `Lubrix: Assalomu alaykum ${customerName}! ${vehicleLabel} uchun moy almashtirish vaqti yaqinlashmoqda. Manzil: ${orgName}`;

    const sendResult = await smsProvider.sendSms({
      to: recipientPhone,
      message: smsText,
      organizationId: req.organizationId
    });

    reminder.status = sendResult.success ? 'sent' : 'failed';
    reminder.attempts += 1;
    if (sendResult.error) {
      reminder.lastError = sendResult.error;
    }
    await reminder.save();

    const logEntry = await MessageLog.create({
      organizationId: req.organizationId,
      reminderId: reminder._id.toString(),
      customerName,
      phone: recipientPhone,
      channel: reminder.channel || 'SMS',
      provider: process.env.SMS_PROVIDER || 'mock',
      providerMessageId: sendResult.providerMessageId || `mock-${Date.now()}`,
      status: reminder.status,
      cost: sendResult.cost || 0.005,
      sentAt: new Date()
    });

    emitTenantEvent(req.organizationId, 'reminder:sent', { reminder, log: logEntry });

    res.json({
      success: true,
      data: {
        reminder,
        log: logEntry
      }
    });
  } catch (err) {
    next(err);
  }
};

export const updateReminder = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates.organizationId;

    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { $set: updates },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Eslatma topilmadi'
      });
    }

    emitTenantEvent(req.organizationId, 'reminder:updated', reminder);

    res.json({
      success: true,
      data: reminder
    });
  } catch (err) {
    next(err);
  }
};

export const deleteReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Eslatma topilmadi'
      });
    }

    emitTenantEvent(req.organizationId, 'reminder:deleted', { id: req.params.id });

    res.json({
      success: true,
      message: 'Eslatma o‘chirildi'
    });
  } catch (err) {
    next(err);
  }
};
