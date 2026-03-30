const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { requireDatabase } = require('../middleware/dbReady');
const { validateRequest } = require('../middleware/validate');

router.use(requireDatabase);

// Login
router.post(
	'/login',
	[body('username').trim().notEmpty().withMessage('Username is required'), body('password').notEmpty().withMessage('Password is required')],
	validateRequest,
	authController.login
);

// Register admin/staff
router.post(
	'/register',
	[
		body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
		body('email').isEmail().withMessage('Valid email is required'),
		body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
		body('role').optional().isIn(['admin', 'teacher', 'staff', 'student']).withMessage('Invalid role')
	],
	validateRequest,
	authController.register
);

// Current authenticated user
router.get('/me', authenticateToken, authController.me);

module.exports = router;
