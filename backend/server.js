const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const multerStorageCloudinary = require('multer-storage-cloudinary');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'barterhub_secret_key_2024';

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'your_api_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret'
});

// Cloudinary Storage for Multer
const storage = multerStorageCloudinary({
  cloudinary: cloudinary,
  params: {
    folder: 'barterhub',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }]
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection - Use MONGODB_URI from environment or fallback to local
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/barterhub';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('❌ MongoDB connection error:', err.message));

// ===========================
// MODELS
// ===========================

// User Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.matchPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};
const User = mongoose.model('User', userSchema);

// Item Model
const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  condition: { type: String, default: 'good' },
  image: { type: String, default: '' },
  lookingFor: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, default: 'available' },
  createdAt: { type: Date, default: Date.now }
});
const Item = mongoose.model('Item', itemSchema);

// Trade Model
const tradeSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  offeredItem: { type: String, required: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requesterContact: {
    name: String,
    location: String
  },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const Trade = mongoose.model('Trade', tradeSchema);

// ===========================
// AUTH MIDDLEWARE
// ===========================

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// ===========================
// ROUTES
// ===========================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BarterHub API is running' });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();
    
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    
    const user = new User({ name, email: normalizedEmail, password });
    await user.save();
    
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ 
      message: 'Registration successful',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email (normalize to lowercase for case-insensitive search)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, bio: user.bio }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all items
app.get('/api/items', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = { status: 'available' };
    
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const items = await Item.find(query).populate('owner', 'name email').sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single item
app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('owner', 'name email');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create item - Handle both JSON and Cloudinary file upload
app.post('/api/items', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, condition, lookingFor, imageUrl } = req.body;
    
    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Please provide title, category, description' });
    }
    
    // Get image from Cloudinary file or URL fallback
    const image = req.file ? req.file.path : imageUrl || '';
    
    const item = new Item({
      title,
      description,
      category,
      condition: condition || 'good',
      image: image,
      lookingFor: lookingFor || '',
      owner: req.userId
    });
    await item.save();
    
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update item
app.put('/api/items/:id', auth, async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, owner: req.userId });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    Object.assign(item, req.body);
    await item.save();
    
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete item
app.delete('/api/items/:id', auth, async (req, res) => {
  try {
    const item = await Item.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user's items
app.get('/api/items/user/my-items', auth, async (req, res) => {
  try {
    const items = await Item.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create trade
app.post('/api/trades', auth, async (req, res) => {
  try {
    const { itemId, offeredItem, location } = req.body;
    
    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.owner.toString() === req.userId) {
      return res.status(400).json({ message: 'Cannot trade your own item' });
    }
    
    const requester = await User.findById(req.userId).select('name');
    
    const trade = new Trade({
      item: itemId,
      offeredItem,
      requester: req.userId,
      owner: item.owner,
      requesterContact: {
        name: requester.name,
        location: location || 'Not provided'
      }
    });
    await trade.save();
    
    const populatedTrade = await Trade.findById(trade._id)
      .populate('item', 'title description image')
      .populate('requester', 'name email')
      .populate('owner', 'name email');
    
    res.status(201).json(populatedTrade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user's trades (sent and received)
app.get('/api/trades', auth, async (req, res) => {
  try {
    const trades = await Trade.find({
      $or: [{ requester: req.userId }, { owner: req.userId }]
    })
    .populate('item', 'title description image')
    .populate('requester', 'name email')
    .populate('owner', 'name email')
    .sort({ createdAt: -1 });
    
    res.json(trades);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Accept trade
app.put('/api/trades/:id/accept', auth, async (req, res) => {
  try {
    const trade = await Trade.findOne({ _id: req.params.id, owner: req.userId });
    if (!trade) return res.status(404).json({ message: 'Trade not found' });
    
    trade.status = 'accepted';
    await trade.save();
    
    // Update item status
    await Item.findByIdAndUpdate(trade.item, { status: 'traded' });
    
    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Decline trade
app.put('/api/trades/:id/decline', auth, async (req, res) => {
  try {
    const trade = await Trade.findOne({ _id: req.params.id, owner: req.userId });
    if (!trade) return res.status(404).json({ message: 'Trade not found' });
    
    trade.status = 'declined';
    await trade.save();
    
    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user profile
app.get('/api/users/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    const items = await Item.find({ owner: req.userId });
    res.json({ user, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update profile
app.put('/api/users/profile', auth, async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, bio, avatar },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ BarterHub API running on http://localhost:${PORT}`);
});

