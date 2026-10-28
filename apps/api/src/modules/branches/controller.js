import { Branch } from '../../models/index.js';
import { emitTenantEvent } from '../../realtime/socket.js';

export const getBranches = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = { organizationId: req.organizationId };
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }

    const [total, branches] = await Promise.all([
      Branch.countDocuments(filter),
      Branch.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);

    res.json({
      success: true,
      data: branches,
      total,
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
};

export const getBranchById = async (req, res, next) => {
  try {
    const branch = await Branch.findOne({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Filial topilmadi'
      });
    }

    res.json({
      success: true,
      data: branch
    });
  } catch (err) {
    next(err);
  }
};

export const createBranch = async (req, res, next) => {
  try {
    const { name, address, latitude, longitude, phone, workingHours } = req.body;

    if (!name || !address) {
      return res.status(400).json({
        success: false,
        error: 'Filial nomi va manzili kiritilishi shart'
      });
    }

    const newBranch = await Branch.create({
      organizationId: req.organizationId,
      name: name.trim(),
      address: address.trim(),
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      phone: phone || '',
      workingHours: workingHours || '08:30 - 20:30',
      isActive: true
    });

    emitTenantEvent(req.organizationId, 'branch:created', newBranch);

    res.status(201).json({
      success: true,
      data: newBranch
    });
  } catch (err) {
    next(err);
  }
};

export const updateBranch = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates.organizationId;

    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { $set: updates },
      { new: true }
    );

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Filial topilmadi'
      });
    }

    emitTenantEvent(req.organizationId, 'branch:updated', branch);

    res.json({
      success: true,
      data: branch
    });
  } catch (err) {
    next(err);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Filial topilmadi'
      });
    }

    emitTenantEvent(req.organizationId, 'branch:deleted', { id: req.params.id });

    res.json({
      success: true,
      message: 'Filial o‘chirildi'
    });
  } catch (err) {
    next(err);
  }
};
