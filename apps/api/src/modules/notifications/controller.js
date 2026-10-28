import { MessageLog } from '../../models/index.js';

export const getLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const { status, channel, search } = req.query;

    const filter = { organizationId: req.organizationId };
    if (status) filter.status = status;
    if (channel) filter.channel = channel;
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { customerName: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ];
    }

    const [total, logs] = await Promise.all([
      MessageLog.countDocuments(filter),
      MessageLog.find(filter).sort({ sentAt: -1, createdAt: -1 }).skip(skip).limit(limit)
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
};

export const getLogStats = async (req, res, next) => {
  try {
    const logs = await MessageLog.find({ organizationId: req.organizationId });
    const totalSent = logs.filter(l => l.status === 'sent' || l.status === 'delivered').length;
    const totalFailed = logs.filter(l => l.status === 'failed').length;
    const totalCost = logs.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);

    res.json({
      success: true,
      data: {
        totalLogs: logs.length,
        totalSent,
        totalFailed,
        totalCost: parseFloat(totalCost.toFixed(4))
      }
    });
  } catch (err) {
    next(err);
  }
};
