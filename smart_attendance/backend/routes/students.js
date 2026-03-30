const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const multer = require('multer');
const studentController = require('../controllers/studentController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { requireDatabase } = require('../middleware/dbReady');
const { validateRequest } = require('../middleware/validate');

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }
});

const isValidFaceDescriptor = (value) => {
	if (!Array.isArray(value) || value.length !== 128) return false;
	return value.every((num) => Number.isFinite(num));
};

router.use(requireDatabase);

// Get all students
router.get('/', authenticateToken, authorizeRoles('admin', 'teacher'), studentController.getAllStudents);
router.get('/my-attendance', authenticateToken, studentController.getMyAttendance);


// Get single student
router.get(
	'/:id',
	authenticateToken,
	authorizeRoles('admin', 'teacher'),
	[param('id').isMongoId().withMessage('Invalid student id')],
	validateRequest,
	studentController.getStudentById
);

// Add new student (register face)
router.post(
	'/register',
	authenticateToken,
	authorizeRoles('admin', 'teacher'),
	[
		body('name').trim().notEmpty().withMessage('Name is required'),
		body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
		body('email').isEmail().withMessage('Valid email is required'),
		body('phone').trim().notEmpty().withMessage('Phone number is required'),
		body('course').trim().notEmpty().withMessage('Course is required'),
		body('branch').trim().notEmpty().withMessage('Branch is required'),
		body('year').isInt({ min: 1, max: 8 }).withMessage('Year must be between 1 and 8'),
		body('department').trim().notEmpty().withMessage('Department is required'),
		body('semester').isInt({ min: 1, max: 12 }).withMessage('Semester must be between 1 and 12'),
								body('faceDescriptor')
									.optional()
									.custom((value) => isValidFaceDescriptor(value))
									.withMessage('Face descriptor must be an array of 128 numeric values')
	],
	validateRequest,
	studentController.registerStudent
);

// Self-register student (public)
router.post(
	'/self-register',
	[
		body('name').trim().notEmpty().withMessage('Name is required'),
		body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
		body('email').isEmail().withMessage('Valid email is required'),
		body('phone').trim().notEmpty().withMessage('Phone number is required'),
		body('course').trim().notEmpty().withMessage('Course is required'),
		body('branch').trim().notEmpty().withMessage('Branch is required'),
		body('year').isInt({ min: 1, max: 8 }).withMessage('Year must be between 1 and 8'),
		body('department').trim().notEmpty().withMessage('Department is required'),
		body('semester').isInt({ min: 1, max: 12 }).withMessage('Semester must be between 1 and 12'),
		body('faceDescriptor')
			.optional()
			.custom((value) => isValidFaceDescriptor(value))
			.withMessage('Face descriptor must be an array of 128 numeric values')
	],
	validateRequest,
	studentController.selfRegisterStudent
);

// Batch import students via CSV
router.post(
	'/import',
	authenticateToken,
	authorizeRoles('admin', 'teacher'),
	upload.single('file'),
	studentController.importStudents
);

// Update student
router.put(
	'/:id',
	authenticateToken,
	authorizeRoles('admin', 'teacher'),
	[
		param('id').isMongoId().withMessage('Invalid student id'),
		body('email').optional().isEmail().withMessage('Valid email is required'),
		body('phone').optional().trim().notEmpty().withMessage('Phone number is required'),
		body('course').optional().trim().notEmpty().withMessage('Course is required'),
		body('branch').optional().trim().notEmpty().withMessage('Branch is required'),
		body('year').optional().isInt({ min: 1, max: 8 }).withMessage('Year must be between 1 and 8'),
		body('semester').optional().isInt({ min: 1, max: 12 }).withMessage('Semester must be between 1 and 12'),
								body('faceDescriptor')
									.optional()
									.custom((value) => isValidFaceDescriptor(value))
									.withMessage('Face descriptor must be an array of 128 numeric values')
	],
	validateRequest,
	studentController.updateStudent
);

// Delete student
router.delete(
	'/:id',
	authenticateToken,
	authorizeRoles('admin', 'teacher'),
	[param('id').isMongoId().withMessage('Invalid student id')],
	validateRequest,
	studentController.deleteStudent
);

// Face recognition endpoint
router.post(
	'/recognize',
	[
		body('faceDescriptor')
		  .custom((value) => isValidFaceDescriptor(value))
		  .withMessage('Face descriptor must be an array of 128 numeric values'),
		body('threshold').optional().isFloat({ min: 0.3, max: 1 }).withMessage('Threshold must be between 0.3 and 1')
	],
	validateRequest,
	studentController.recognizeFace
);

module.exports = router;
