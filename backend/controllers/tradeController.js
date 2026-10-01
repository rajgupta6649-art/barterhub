const Trade = require('../models/Trade');
const Item = require('../models/Item');
const User = require('../models/User');

// Create trade proposal
exports.createTradeProposal = async (req, res) => {
  try {
    const { initiatorItemId, recipientItemId, message } = req.body;

    // Validate items
    const initiatorItem = await Item.findById(initiatorItemId);
    const recipientItem = await Item.findById(recipientItemId);

    if (!initiatorItem || !recipientItem) {
      return res.status(404).json({
        success: false,
        message: 'One or both items not found'
      });
    }

    // Check authorization
    if (initiatorItem.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only trade with your own items'
      });
    }

    // Check if items are available
    if (initiatorItem.status !== 'available' || recipientItem.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'One or both items are not available for trade'
      });
    }

    // Create trade
    const trade = await Trade.create({
      initiator: req.user.id,
      recipient: recipientItem.owner,
      initiatorItem: initiatorItemId,
      recipientItem: recipientItemId,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Trade proposal sent',
      trade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating trade proposal',
      error: error.message
    });
  }
};

// Get all trades for user
exports.getUserTrades = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    let query = {
      $or: [
        { initiator: req.user.id },
        { recipient: req.user.id }
      ]
    };

    if (status) query.status = status;

    const trades = await Trade.find(query)
      .populate('initiator', 'name avatar email')
      .populate('recipient', 'name avatar email')
      .populate('initiatorItem', 'title images')
      .populate('recipientItem', 'title images')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Trade.countDocuments(query);

    res.status(200).json({
      success: true,
      count: trades.length,
      total,
      pages: Math.ceil(total / limit),
      trades
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching trades',
      error: error.message
    });
  }
};

// Get single trade
exports.getTradeById = async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id)
      .populate('initiator', 'name avatar email phone location')
      .populate('recipient', 'name avatar email phone location')
      .populate('initiatorItem', 'title description images condition')
      .populate('recipientItem', 'title description images condition');

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }

    res.status(200).json({
      success: true,
      trade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching trade',
      error: error.message
    });
  }
};

// Accept trade
exports.acceptTrade = async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }

    // Check authorization
    if (trade.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only recipient can accept this trade'
      });
    }

    trade.status = 'accepted';
    trade.acceptedAt = Date.now();
    await trade.save();

    res.status(200).json({
      success: true,
      message: 'Trade accepted',
      trade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error accepting trade',
      error: error.message
    });
  }
};

// Decline trade
exports.declineTrade = async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }

    // Check authorization
    if (trade.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only recipient can decline this trade'
      });
    }

    trade.status = 'declined';
    await trade.save();

    res.status(200).json({
      success: true,
      message: 'Trade declined',
      trade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error declining trade',
      error: error.message
    });
  }
};

// Rate trade
exports.rateTrade = async (req, res) => {
  try {
    const { rating, review } = req.body;

    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }

    // Determine if user is initiator or recipient
    const isInitiator = trade.initiator.toString() === req.user.id;
    const isRecipient = trade.recipient.toString() === req.user.id;

    if (!isInitiator && !isRecipient) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this trade'
      });
    }

    if (isInitiator) {
      trade.rating.fromInitiator = {
        rating,
        review,
        ratedAt: Date.now()
      };
    } else {
      trade.rating.fromRecipient = {
        rating,
        review,
        ratedAt: Date.now()
      };
    }

    await trade.save();

    res.status(200).json({
      success: true,
      message: 'Trade rated successfully',
      trade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rating trade',
      error: error.message
    });
  }
};
