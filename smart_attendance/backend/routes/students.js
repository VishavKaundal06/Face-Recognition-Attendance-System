const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const studentController = require('../controllers/studentController');
const { authenticateToken } = require('../middleware/auth');
const { requireDatabase } = require('../middleware/dbReady');
const { validateRequest } = require('../middleware/validate');

const isValidFaceDescriptor = (value) => {
	if (!Array.isArray(value) || value.length !== 128) return false;
	return value.every((num) => Number.isFinite(num));
};

router.use(requireDatabase);

// Get all students
router.get('/', authenticateToken, studentController.getAllStudents);

// Get single student
router.get(
	'/:id',
	authenticateToken,
	[param('id').isMongoId().withMessage('Invalid student id')],
	validateRequest,
	studentController.getStudentById
);

// Add new student (register face)
router.post(
	'/register',
	authenticateToken,
	[
		body('name').trim().notEmpty().withMessage('Name is required'),
		body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
		body('email').isEmail().withMessage('Valid email is required'),
		body('department').trim().notEmpty().withMessage('Department is required'),
		body('semester').isInt({ min: 1, max: 12 }).withMessage('Semester must be between 1 and 12'),
								body('faceDescriptor')
									.optional()
									.custom((value) => isValidFaceDescriptor(value))
									.withMessage('Face descriptor must be an array of 128 numeric values'),
	],
	validateRequest,
	studentController.registerStudent
);

// Update student
router.put(
	'/:id',
	authenticateToken,
	[
		param('id').isMongoId().withMessage('Invalid student id'),
		body('email').optional().isEmail().withMessage('Valid email is required'),
		body('semester').optional().isInt({ min: 1, max: 12 }).withMessage('Semester must be between 1 and 12'),
								body('faceDescriptor')
									.optional()
									.custom((value) => isValidFaceDescriptor(value))
									.withMessage('Face descriptor must be an array of 128 numeric values'),
	],
	validateRequest,
	studentController.updateStudent
);

// Delete student
router.delete(
	'/:id',
	authenticateToken,
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
		body('threshold').optional().isFloat({ min: 0.3, max: 1 }).withMessage('Threshold must be between 0.3 and 1'),
	],
	validateRequest,
	studentController.recognizeFace
);

module.exports = router;
