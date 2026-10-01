const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Chat = require('../models/Chat');

const router = express.Router();

// Get all chats for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
      .populate('participants', 'name avatar email')
      .populate('relatedTrade')
      .sort({ lastMessageTime: -1 });

    res.status(200).json({
      success: true,
      count: chats.length,
      chats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching chats',
      error: error.message
    });
  }
});

// Get or create chat
router.post('/with/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot chat with yourself'
      });
    }

    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, userId] }
    }).populate('participants', 'name avatar email');

    if (!chat) {
      chat = await Chat.create({
        participants: [req.user.id, userId]
      });
      await chat.populate('participants', 'name avatar email');
    }

    res.status(200).json({
      success: true,
      chat
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting or creating chat',
      error: error.message
    });
  }
});

// Get chat messages
router.get('/:chatId', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate('participants', 'name avatar email')
      .populate('messages');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.participants.some(p => p._id.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this chat'
      });
    }

    res.status(200).json({
      success: true,
      chat
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching chat',
      error: error.message
    });
  }
});

// Send message
router.post('/:chatId/message', authenticateToken, async (req, res) => {
  try {
    const { text, image } = req.body;

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to message in this chat'
      });
    }

    const message = {
      text,
      image,
      createdAt: Date.now()
    };

    chat.messages.push(message);
    chat.lastMessage = text;
    chat.lastMessageTime = Date.now();
    await chat.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      chat
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
});

module.exports = router;
