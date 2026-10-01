const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: ['books', 'electronics', 'clothing', 'home', 'sports', 'furniture', 'other']
  },
  condition: {
    type: String,
    required: [true, 'Please specify condition'],
    enum: ['new', 'like-new', 'good', 'fair', 'poor']
  },
  images: [{
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  preferredTrades: [{
    type: String
  }],
  location: {
    city: String,
    state: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  },
  status: {
    type: String,
    enum: ['available', 'pending-trade', 'traded', 'delisted'],
    default: 'available'
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [String],
  tradeHistory: [{
    tradeId: mongoose.Schema.Types.ObjectId,
    tradedWith: mongoose.Schema.Types.ObjectId,
    date: Date,
    status: String
  }],
  isReported: {
    type: Boolean,
    default: false
  },
  reportReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create geospatial index
itemSchema.index({ 'location.coordinates': '2dsphere' });
itemSchema.index({ category: 1 });
itemSchema.index({ status: 1 });
itemSchema.index({ owner: 1 });

module.exports = mongoose.model('Item', itemSchema);
