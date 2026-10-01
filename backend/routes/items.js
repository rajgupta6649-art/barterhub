const express = require('express');
const itemController = require('../controllers/itemController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', itemController.getAllItems);
router.get('/:id', itemController.getItemById);

// Protected routes
router.post('/', authenticateToken, itemController.createItem);
router.put('/:id', authenticateToken, itemController.updateItem);
router.delete('/:id', authenticateToken, itemController.deleteItem);
router.post('/:id/like', authenticateToken, itemController.toggleLike);
router.get('/user/my-items', authenticateToken, itemController.getUserItems);

module.exports = router;
