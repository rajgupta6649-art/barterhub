const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const User = require('../models/User');
const Item = require('../models/Item');
const Trade = require('../models/Trade');

const router = express.Router();

// Dashboard stats
router.get('/stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeItems = await Item.countDocuments({ status: 'available' });
    const completedTrades = await Trade.countDocuments({ status: 'completed' });
    const pendingTrades = await Trade.countDocuments({ status: 'proposed' });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeItems,
        completedTrades,
        pendingTrades
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message
    });
  }
});

// Suspend user
router.put('/users/:userId/suspend', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status: 'suspended' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User suspended successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error suspending user',
      error: error.message
    });
  }
});

// Report item
router.put('/items/:itemId/report', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;

    const item = await Item.findByIdAndUpdate(
      req.params.itemId,
      {
        isReported: true,
        reportReason: reason
      },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Item reported successfully',
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reporting item',
      error: error.message
    });
  }
});

// Get reported items
router.get('/items/reported', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const reportedItems = await Item.find({ isReported: true })
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reportedItems.length,
      items: reportedItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reported items',
      error: error.message
    });
  }
});

module.exports = router;
