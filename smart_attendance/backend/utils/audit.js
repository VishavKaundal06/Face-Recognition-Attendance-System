const AuditLog = require('../models/AuditLog');

const logAudit = async ({ req, action, entityType, entityId, metadata = {} }) => {
  try {
    await AuditLog.create({
      actorId: req?.user?.userId,
      actorRole: req?.user?.role,
      action,
      entityType,
      entityId: entityId ? String(entityId) : undefined,
      metadata,
    });
  } catch (error) {
    console.warn('Audit log failed:', error.message);
  }
};

module.exports = { logAudit };
