const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  initiatorItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  recipientItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  status: {
    type: String,
    enum: ['proposed', 'accepted', 'in-progress', 'verification', 'completed', 'declined', 'cancelled'],
    default: 'proposed'
  },
  message: {
    type: String,
    maxlength: [500, 'Message cannot be more than 500 characters']
  },
  verificationStatus: {
    initiatorVerified: {
      type: Boolean,
      default: false
    },
    recipientVerified: {
      type: Boolean,
      default: false
    },
    verificationDate: Date,
    verificationNotes: String
  },
  shippingInfo: {
    initiatorShipped: {
      type: Boolean,
      default: false
    },
    initiatorTrackingNumber: String,
    initiatorShippedDate: Date,
    recipientShipped: {
      type: Boolean,
      default: false
    },
    recipientTrackingNumber: String,
    recipientShippedDate: Date
  },
  rating: {
    fromInitiator: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String,
      ratedAt: Date
    },
    fromRecipient: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String,
      ratedAt: Date
    }
  },
  evidence: [{
    type: String,
    description: String,
    uploadedAt: Date
  }],
  disputeInfo: {
    isDisputed: {
      type: Boolean,
      default: false
    },
    disputedBy: mongoose.Schema.Types.ObjectId,
    disputeReason: String,
    disputeDate: Date,
    resolution: String,
    resolvedAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Trade', tradeSchema);
