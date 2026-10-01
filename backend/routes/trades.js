const express = require('express');
const tradeController = require('../controllers/tradeController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Protected routes
router.post('/', authenticateToken, tradeController.createTradeProposal);
router.get('/', authenticateToken, tradeController.getUserTrades);
router.get('/:id', authenticateToken, tradeController.getTradeById);
router.put('/:id/accept', authenticateToken, tradeController.acceptTrade);
router.put('/:id/decline', authenticateToken, tradeController.declineTrade);
router.put('/:id/rate', authenticateToken, tradeController.rateTrade);

module.exports = router;
