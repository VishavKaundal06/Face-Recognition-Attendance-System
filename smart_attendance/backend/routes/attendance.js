const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/auth');
const { requireDatabase } = require('../middleware/dbReady');
const { validateRequest } = require('../middleware/validate');

router.use(requireDatabase);

// Mark attendance
router.post(
	'/mark',
	[
		body('studentId').isMongoId().withMessage('Valid studentId is required'),
		body('status').optional().isIn(['present', 'absent', 'late', 'leave']).withMessage('Invalid status'),
		body('confidence').optional().isFloat({ min: 0, max: 100 }).withMessage('Confidence must be 0-100'),
	],
	validateRequest,
	attendanceController.markAttendance
);

// Public recent attendance lookup (student view)
router.get(
	'/recent',
	[
		query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
		query('rollNumber').optional().trim().notEmpty().withMessage('rollNumber cannot be empty'),
		query('date').optional().isISO8601().withMessage('date must be YYYY-MM-DD'),
	],
	validateRequest,
	attendanceController.getRecentAttendance
);

// Get attendance by date
router.get(
	'/date/:date',
	authenticateToken,
	[param('date').isISO8601().withMessage('Date must be YYYY-MM-DD')],
	validateRequest,
	attendanceController.getAttendanceByDate
);

// Get attendance by student
router.get(
	'/student/:studentId',
	authenticateToken,
	[
		param('studentId').isMongoId().withMessage('Invalid student id'),
		query('startDate').optional().isISO8601().withMessage('startDate must be YYYY-MM-DD'),
		query('endDate').optional().isISO8601().withMessage('endDate must be YYYY-MM-DD'),
	],
	validateRequest,
	attendanceController.getStudentAttendance
);

// Get all attendance records
router.get(
	'/',
	authenticateToken,
	[
		query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
		query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be 1-500'),
		query('date').optional().isISO8601().withMessage('date must be YYYY-MM-DD'),
	],
	validateRequest,
	attendanceController.getAllAttendance
);

// Get attendance statistics
router.get(
	'/stats/summary',
	authenticateToken,
	[
		query('startDate').optional().isISO8601().withMessage('startDate must be YYYY-MM-DD'),
		query('endDate').optional().isISO8601().withMessage('endDate must be YYYY-MM-DD'),
	],
	validateRequest,
	attendanceController.getAttendanceStats
);

// Get attendance report
router.get(
	'/report',
	authenticateToken,
	[
		query('startDate').isISO8601().withMessage('startDate must be YYYY-MM-DD'),
		query('endDate').isISO8601().withMessage('endDate must be YYYY-MM-DD'),
	],
	validateRequest,
	attendanceController.getAttendanceReport
);

module.exports = router;
