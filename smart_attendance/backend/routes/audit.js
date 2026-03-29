const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const auditController = require('../controllers/auditController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { requireDatabase } = require('../middleware/dbReady');
const { validateRequest } = require('../middleware/validate');

router.use(requireDatabase);

router.get(
  '/logs',
  authenticateToken,
  authorizeRoles('admin'),
  [query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be 1-500')],
  validateRequest,
  auditController.listAuditLogs
);

module.exports = router;
