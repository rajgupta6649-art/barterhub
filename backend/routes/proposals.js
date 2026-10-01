const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get trade proposals
router.get('/', authenticateToken, async (req, res) => {
  try {
    const Trade = require('../models/Trade');
    const { type = 'received' } = req.query;

    let query;
    if (type === 'sent') {
      query = { initiator: req.user.id };
    } else {
      query = { recipient: req.user.id };
    }

    const proposals = await Trade.find(query)
      .populate('initiator', 'name avatar email')
      .populate('recipient', 'name avatar email')
      .populate('initiatorItem', 'title images condition')
      .populate('recipientItem', 'title images condition')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: proposals.length,
      proposals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching proposals',
      error: error.message
    });
  }
});

module.exports = router;
