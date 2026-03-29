const AuditLog = require('../models/AuditLog');

exports.listAuditLogs = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
