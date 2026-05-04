const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.get('/users', authenticate, authorize('admin'), authController.getAllUsers);

// Admin only route example
router.get('/admin-dashboard', authenticate, authorize('admin'), (req, res) => {
  res.json({ message: 'Welcome to the admin dashboard!' });
});

// Member and Admin route example
router.get('/tasks', authenticate, authorize('admin', 'member'), (req, res) => {
  res.json({ message: 'List of tasks here.' });
});

module.exports = router;
