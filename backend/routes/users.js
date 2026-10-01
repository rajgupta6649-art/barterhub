const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/:id', userController.getUserProfile);
router.get('/:id/stats', userController.getUserStats);

// Protected routes - Profile (MUST be before /:id route)
router.get('/profile', authenticateToken, userController.getMyProfile);

// Protected routes
router.put('/profile', authenticateToken, userController.updateProfile);
router.put('/avatar', authenticateToken, userController.updateAvatar);
router.put('/preferences', authenticateToken, userController.updateNotificationPreferences);
router.get('/search', userController.searchUsers);

// Admin routes
router.get('/', authenticateToken, authorizeRole('admin'), userController.getAllUsers);

module.exports = router;
