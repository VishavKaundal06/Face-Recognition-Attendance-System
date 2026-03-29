const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
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
		body('deviceInfo').optional().isObject().withMessage('deviceInfo must be an object'),
		body('location').optional().isObject().withMessage('location must be an object'),
	],
	validateRequest,
	attendanceController.markAttendance
);

// Attendance correction request
router.post(
	'/corrections',
	authenticateToken,
	authorizeRoles('admin', 'teacher'),
	[
		body('attendanceId').isMongoId().withMessage('attendanceId is required'),
		body('reason').trim().notEmpty().withMessage('reason is required'),
		body('requestedStatus').isIn(['present', 'absent', 'late', 'leave']).withMessage('Invalid status'),
	],
	validateRequest,
	attendanceController.createCorrectionRequest
);

// List correction requests
router.get(
	'/corrections',
	authenticateToken,
	authorizeRoles('admin', 'teacher'),
	attendanceController.listCorrectionRequests
);

// Review correction request
router.patch(
	'/corrections/:id',
	authenticateToken,
	authorizeRoles('admin'),
	[
		param('id').isMongoId().withMessage('Invalid correction id'),
		body('status').isIn(['approved', 'rejected']).withMessage('Invalid status'),
		body('reviewNote').optional().trim(),
	],
	validateRequest,
	attendanceController.reviewCorrectionRequest
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
	authorizeRoles('admin', 'teacher'),
	[param('date').isISO8601().withMessage('Date must be YYYY-MM-DD')],
	validateRequest,
	attendanceController.getAttendanceByDate
);

// Get attendance by student
router.get(
	'/student/:studentId',
	authenticateToken,
	authorizeRoles('admin', 'teacher'),
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
	authorizeRoles('admin', 'teacher'),
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
	authorizeRoles('admin', 'teacher'),
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
	authorizeRoles('admin', 'teacher'),
	[
		query('startDate').isISO8601().withMessage('startDate must be YYYY-MM-DD'),
		query('endDate').isISO8601().withMessage('endDate must be YYYY-MM-DD'),
	],
	validateRequest,
	attendanceController.getAttendanceReport
);

module.exports = router;
