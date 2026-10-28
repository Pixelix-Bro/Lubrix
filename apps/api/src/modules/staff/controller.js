import bcrypt from 'bcryptjs';
import { User } from '../../models/index.js';
import { emitTenantEvent } from '../../realtime/socket.js';

export const getStaff = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = { organizationId: req.organizationId };
    if (req.query.search) {
      const q = req.query.search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ];
    }
    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.branchId) {
      filter.branchId = req.query.branchId;
    }

    const [total, staffList] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);

    res.json({
      success: true,
      data: staffList,
      total,
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
};

export const getStaffById = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    }).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Xodim topilmadi'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

export const createStaff = async (req, res, next) => {
  try {
    const { name, email, password = 'LubrixPassword123!', role = 'STAFF', branchId, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Ism va email kiritilishi shart'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Ushbu email bilan foydalanuvchi allaqachon mavjud'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      organizationId: req.organizationId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role,
      branchId,
      phone: phone || '',
      isActive: true
    });

    const safeUser = newUser.toObject();
    delete safeUser.passwordHash;

    emitTenantEvent(req.organizationId, 'staff:created', safeUser);

    res.status(201).json({
      success: true,
      data: safeUser
    });
  } catch (err) {
    next(err);
  }
};

export const updateStaff = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates.organizationId;

    if (updates.password) {
      updates.passwordHash = await bcrypt.hash(updates.password, 12);
      delete updates.password;
    }
    if (updates.email) {
      updates.email = updates.email.toLowerCase().trim();
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { $set: updates },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Xodim topilmadi'
      });
    }

    emitTenantEvent(req.organizationId, 'staff:updated', user);

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

export const deleteStaff = async (req, res, next) => {
  try {
    // Prevent deleting oneself
    if (req.params.id === req.userId) {
      return res.status(400).json({
        success: false,
        error: 'O‘z hisobingizni o‘chira olmaysiz'
      });
    }

    const user = await User.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Xodim topilmadi'
      });
    }

    emitTenantEvent(req.organizationId, 'staff:deleted', { id: req.params.id });

    res.json({
      success: true,
      message: 'Xodim o‘chirildi'
    });
  } catch (err) {
    next(err);
  }
};
