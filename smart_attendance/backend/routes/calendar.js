const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const calendarController = require('../controllers/calendarController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { requireDatabase } = require('../middleware/dbReady');
const { validateRequest } = require('../middleware/validate');

router.use(requireDatabase);

router.get('/holidays', authenticateToken, authorizeRoles('admin', 'teacher'), calendarController.listHolidays);
router.get('/my-timetable', authenticateToken, calendarController.getMyTimetable);


router.post(
  '/holidays',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('type').optional().isIn(['holiday', 'leave']).withMessage('Invalid type'),
  ],
  validateRequest,
  calendarController.createHoliday
);

router.delete(
  '/holidays/:id',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  [param('id').isMongoId().withMessage('Invalid holiday id')],
  validateRequest,
  calendarController.deleteHoliday
);

module.exports = router;
