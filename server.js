// ===========================
// BARTERHUB - SERVER.JS
// Express & MongoDB Backend
// ===========================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Initialize Express App
const app = express();

// ===========================
// MIDDLEWARE
// ===========================

// Enable CORS for all routes
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// ===========================
// JWT AUTHENTICATION MIDDLEWARE
// ===========================

/**
 * Middleware to verify JWT token from Authorization header
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
function authenticateToken(req, res, next) {
    // Get token from Authorization header (format: "Bearer TOKEN")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token after "Bearer "

    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No token provided. Please login first.',
            details: 'Missing Authorization header'
        });
    }

    // Verify the token
    jwt.verify(token, 'mysecretkey', (err, user) => {
        if (err) {
            console.error('❌ Token verification failed:', err.message);
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Invalid or expired token',
                details: err.message
            });
        }

        // Token is valid, attach user info to request
        req.user = user;
        console.log(`✅ Token verified for user: ${user.email}`);
        next();
    });
}

// ===========================
// MONGODB CONNECTION
// ===========================

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/barterDB';

mongoose.connect(mongoURI)
    .then(() => {
        console.log('✅ MongoDB Connected Successfully!');
        console.log(`📊 Database: barterDB`);
        console.log(`🔗 Connection URI: ${mongoURI}`);
    })
    .catch((error) => {
        console.error('❌ MongoDB Connection Failed!');
        console.error('📝 Error Details:', error.message);
        process.exit(1);
    });

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB Disconnected');
});

mongoose.connection.on('error', (error) => {
    console.error('🔴 MongoDB Error:', error);
});

// ===========================
// MONGOOSE SCHEMAS & MODELS
// ===========================

// -------- USER SCHEMA --------
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'User name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters long'],
            maxlength: [100, 'Name cannot exceed 100 characters']
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email address'
            ]
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters long'],
            select: false
        },
        bio: {
            type: String,
            default: '',
            maxlength: [500, 'Bio cannot exceed 500 characters']
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Create User Model
const User = mongoose.model('User', userSchema);

// -------- ITEM SCHEMA --------
const itemSchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Owner ID is required']
        },
        title: {
            type: String,
            required: [true, 'Item title is required'],
            trim: true,
            minlength: [3, 'Title must be at least 3 characters long'],
            maxlength: [200, 'Title cannot exceed 200 characters']
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: {
                values: ['Electronics', 'Books', 'Fashion', 'Home', 'Gaming', 'Sports', 'Toys', 'Other'],
                message: 'Please select a valid category'
            }
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
            minlength: [10, 'Description must be at least 10 characters long'],
            maxlength: [2000, 'Description cannot exceed 2000 characters']
        },
        lookingFor: {
            type: String,
            required: [true, 'Please specify what you are looking for'],
            trim: true,
            minlength: [3, 'Must be at least 3 characters long'],
            maxlength: [500, 'Cannot exceed 500 characters']
        },
        image: {
            type: String,
            default: ''
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Create Item Model
const Item = mongoose.model('Item', itemSchema);

// ===========================
// TRADE SCHEMA
// ===========================

const tradeSchema = new mongoose.Schema(
    {
        requestedItemId: {
            type: String,
            required: [true, 'Requested item ID is required']
        },
        offeredItem: {
            type: String,
            required: [true, 'Please specify what you are offering'],
            trim: true,
            minlength: [3, 'Must be at least 3 characters long'],
            maxlength: [500, 'Cannot exceed 500 characters']
        },
        contactEmail: {
            type: String,
            required: [true, 'Email address is required'],
            trim: true,
            lowercase: true,
            match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
        },
        status: {
            type: String,
            default: 'Pending',
            enum: ['Pending', 'Accepted', 'Rejected', 'Completed'],
            message: 'Status must be Pending, Accepted, Rejected, or Completed'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Create Trade Model
const Trade = mongoose.model('Trade', tradeSchema);

// Export models for use in other files later
app.locals.User = User;
app.locals.Item = Item;
app.locals.Trade = Trade;

// ===========================
// ROUTES
// ===========================

// ===========================
// AUTHENTICATION ROUTES
// ===========================

// -------- POST ROUTE: REGISTER NEW USER --------
/**
 * POST /api/auth/register
 * Register a new user with name, email, and password
 * 
 * Request body:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Please provide name, email, and password',
                receivedFields: {
                    name: !!name,
                    email: !!email,
                    password: !!password
                }
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({
                error: 'User already exists',
                message: 'An account with this email already exists',
                email: email
            });
        }

        // Hash password with bcryptjs
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);

        console.log('🔐 Password hashed successfully');

        // Create new user
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword
        });

        // Save user to database
        const savedUser = await newUser.save();

        console.log(`✅ New user registered: ${savedUser.email} (ID: ${savedUser._id})`);

        // Return success response (without password)
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                _id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email
            },
            timestamp: new Date()
        });

    } catch (error) {
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = {};
            Object.keys(error.errors).forEach(field => {
                validationErrors[field] = error.errors[field].message;
            });

            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid data provided',
                details: validationErrors
            });
        }

        // Handle duplicate email error
        if (error.code === 11000) {
            return res.status(409).json({
                error: 'Duplicate email',
                message: 'This email is already registered',
                field: 'email'
            });
        }

        // Handle other errors
        console.error('❌ Error registering user:', error.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Failed to register user',
            details: error.message
        });
    }
});

// -------- POST ROUTE: LOGIN USER --------
/**
 * POST /api/auth/login
 * Login a user with email and password
 * Returns a JWT token for authenticated requests
 * 
 * Request body:
 * {
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Please provide email and password',
                receivedFields: {
                    email: !!email,
                    password: !!password
                }
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            console.warn(`⚠️  Login attempt with non-existent email: ${email}`);
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }

        // Compare password with hashed password
        const isPasswordValid = await bcryptjs.compare(password, user.password);

        if (!isPasswordValid) {
            console.warn(`⚠️  Failed login attempt for user: ${email}`);
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            'mysecretkey',
            { expiresIn: '7d' }
        );

        console.log(`✅ User logged in successfully: ${user.email}`);

        // Return success response with token
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            },
            timestamp: new Date()
        });

    } catch (error) {
        console.error('❌ Error during login:', error.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Failed to login',
            details: error.message
        });
    }
});

// -------- TEST ROUTE --------
/**
 * GET /api/test
 * Simple test route to verify backend is working
 */
app.get('/api/test', (req, res) => {
    res.status(200).json({
        message: 'Backend is working!',
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// -------- HEALTH CHECK ROUTE --------
/**
 * GET /api/health
 * Comprehensive health check endpoint
 */
app.get('/api/health', async (req, res) => {
    try {
        const dbConnectionState = mongoose.connection.readyState;
        const dbConnected = dbConnectionState === 1;

        res.status(200).json({
            status: 'OK',
            message: 'Server is healthy',
            timestamp: new Date(),
            database: {
                connected: dbConnected,
                name: mongoose.connection.name || 'barterDB'
            },
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Health check failed',
            error: error.message
        });
    }
});

// -------- INFO ROUTE --------
/**
 * GET /api/info
 * Get information about the API
 */
app.get('/api/info', (req, res) => {
    res.status(200).json({
        name: 'BarterHub API',
        version: '1.0.0',
        description: 'Backend API for a peer-to-peer barter trading platform',
        author: 'BarterHub Team',
        database: 'MongoDB (Mongoose)',
        baseURL: 'http://localhost:3000',
        endpoints: {
            test: 'GET /api/test',
            health: 'GET /api/health',
            info: 'GET /api/info'
        },
        timestamp: new Date()
    });
});

// ===========================
// ITEM ROUTES
// ===========================

// -------- POST ROUTE: CREATE NEW ITEM --------
/**
 * POST /api/items
 * Create a new item for trading
 * 
 * Request body:
 * {
 *   "title": "Item Title",
 *   "category": "Electronics",
 *   "description": "Detailed description of the item",
 *   "lookingFor": "What the user is looking for in return"
 * }
 */
app.post('/api/items', authenticateToken, async (req, res) => {
    try {
        // Destructure request body
        const { title, category, description, lookingFor, image } = req.body;

        // Validate required fields
        if (!title || !category || !description || !lookingFor) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Please provide title, category, description, and lookingFor',
                receivedFields: {
                    title: !!title,
                    category: !!category,
                    description: !!description,
                    lookingFor: !!lookingFor
                }
            });
        }

        // Create new item document with ownerId from authenticated user
        const newItem = new Item({
            ownerId: req.user._id,
            title: title.trim(),
            category: category.trim(),
            description: description.trim(),
            lookingFor: lookingFor.trim(),
            image: image || ''
        });

        // Save item to database
        const savedItem = await newItem.save();

        // Log success
        console.log(`✅ New item created: "${savedItem.title}" (ID: ${savedItem._id})`);

        // Return the saved item with 201 Created status
        res.status(201).json({
            success: true,
            message: 'Item created successfully',
            item: savedItem,
            timestamp: new Date()
        });

    } catch (error) {
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = {};
            Object.keys(error.errors).forEach(field => {
                validationErrors[field] = error.errors[field].message;
            });

            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid data provided',
                details: validationErrors
            });
        }

        // Handle other errors
        console.error('❌ Error creating item:', error.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Failed to create item',
            details: error.message
        });
    }
});

// -------- GET ROUTE: FETCH ALL ITEMS --------
/**
 * GET /api/items
 * Retrieve all items from the database
 * 
 * Query parameters (optional):
 * - ?category=Electronics (filter by category)
 * - ?limit=10 (limit results)
 * - ?skip=0 (pagination)
 * - ?sort=-createdAt (sort by field)
 */
app.get('/api/items', async (req, res) => {
    try {
        // Extract query parameters
        const { category, limit = 100, skip = 0, sort = '-createdAt' } = req.query;

        // Build query filter
        let query = {};
        if (category) {
            query.category = category;
        }

        // Fetch items with optional filtering, sorting, and pagination
        const items = await Item.find(query)
            .sort(sort)
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        // Get total count for pagination info
        const totalCount = await Item.countDocuments(query);

        // Log success
        console.log(`✅ Fetched ${items.length} item(s) from database`);

        // Return items with metadata - populate owner info
        const itemsWithOwner = await Item.find(query)
            .sort(sort)
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .populate('ownerId', 'name email');

        res.status(200).json({
            success: true,
            message: 'Items retrieved successfully',
            data: {
                items: itemsWithOwner,
                pagination: {
                    total: totalCount,
                    returned: itemsWithOwner.length,
                    limit: parseInt(limit),
                    skip: parseInt(skip),
                    hasMore: parseInt(skip) + itemsWithOwner.length < totalCount
                }
            },
            timestamp: new Date()
        });

    } catch (error) {
        // Handle errors
        console.error('❌ Error fetching items:', error.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Failed to fetch items',
            details: error.message
        });
    }
});

// -------- GET ROUTE: FETCH SINGLE ITEM BY ID --------
/**
 * GET /api/items/:id
 * Retrieve a single item by its MongoDB _id
 * 
 * Parameters:
 * - id: MongoDB ObjectId of the item
 */
app.get('/api/items/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate if id is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: 'Invalid Item ID',
                message: 'The provided ID is not a valid MongoDB ObjectId',
                receivedId: id
            });
        }

        // Find item by id
        const item = await Item.findById(id);

        // Check if item exists
        if (!item) {
            console.warn(`⚠️  Item not found with ID: ${id}`);
            return res.status(404).json({
                error: 'Not Found',
                message: 'Item with the specified ID does not exist',
                itemId: id
            });
        }

        // Log success
        console.log(`✅ Fetched item: "${item.title}" (ID: ${id})`);

        // Return the item
        res.status(200).json({
            success: true,
            message: 'Item retrieved successfully',
            item: item,
            timestamp: new Date()
        });

    } catch (error) {
        // Handle errors
        console.error('❌ Error fetching item:', error.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Failed to fetch item',
            details: error.message
        });
    }
});

// -------- DELETE ROUTE: DELETE ITEM --------
/**
 * DELETE /api/items/:id
 * Delete an item (only owner can delete)
 * 
 * Parameters:
 * - id: MongoDB ObjectId of the item
 */
app.delete('/api/items/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Validate if id is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: 'Invalid Item ID',
                message: 'The provided ID is not a valid MongoDB ObjectId',
                receivedId: id
            });
        }

        // Find item by id
        const item = await Item.findById(id);

        // Check if item exists
        if (!item) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Item with the specified ID does not exist',
                itemId: id
            });
        }

        // Check if the current user is the owner
        if (item.ownerId.toString() !== userId) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You can only delete your own items'
            });
        }

        // Delete the item
        await Item.findByIdAndDelete(id);

        // Log success
        console.log(`✅ Item deleted: "${item.title}" (ID: ${id})`);

        // Return success
        res.status(200).json({
            success: true,
            message: 'Item deleted successfully',
            timestamp: new Date()
        });

    } catch (error) {
        // Handle errors
        console.error('❌ Error deleting item:', error.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Failed to delete item',
            details: error.message
        });
    }
});

// ===========================
// USER ROUTES
// ===========================

// -------- GET ROUTE: USER PROFILE --------
/**
 * GET /api/users/profile
 * Get authenticated user's profile and their items
 * 
 * Protected route - requires valid JWT token
 * Returns user info and all items owned by this user
 */
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        // Get user ID from JWT token payload
        const userId = req.user._id;

        console.log(`📋 Fetching profile for user: ${userId}`);

        // Find user by ID (exclude password)
        const user = await User.findById(userId).select('-password');

        if (!user) {
            console.warn(`⚠️  User not found: ${userId}`);
            return res.status(404).json({
                error: 'Not Found',
                message: 'User profile not found',
                userId: userId
            });
        }

        // Find all items owned by this user (also populate owner for display)
        const userItems = await Item.find({ ownerId: userId })
            .sort('-createdAt')
            .populate('ownerId', 'name email');

        console.log(`✅ Profile fetched for user: ${user.email}`);
        console.log(`📦 Found ${userItems.length} item(s) owned by user`);

        // Return user info and items
        res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    bio: user.bio || '',
                    createdAt: user.createdAt
                },
                items: userItems,
                itemCount: userItems.length
            },
            timestamp: new Date()
        });

    } catch (error) {
        console.error('❌ Error fetching profile:', error.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Failed to fetch profile',
            details: error.message
        });
    }
});

// -------- PUT ROUTE: UPDATE USER PROFILE --------
/**
 * PUT /api/users/profile
 * Update authenticated user's profile
 * 
 * Protected route - requires valid JWT token
 */
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        // Get user ID from JWT token payload
        const userId = req.user._id;
        
        // Get update data
        const { name, bio } = req.body;
        
        // Validate
        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Name must be at least 2 characters long'
            });
        }

        // Build update object
        const updateData = { name: name.trim() };
        if (bio !== undefined) {
            updateData.bio = bio.trim();
        }

        // Find and update user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found'
            });
        }

        console.log(`✅ Profile updated for user: ${updatedUser.email}`);

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('❌ Error updating profile:', error.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Failed to update profile',
            details: error.message
        });
    }
});

// ===========================
// TRADE ROUTES
// ===========================

// -------- POST ROUTE: CREATE NEW TRADE OFFER --------
/**
 * POST /api/trades
 * Create a new trade offer
 * 
 * Request body:
 * {
 *   "requestedItemId": "MongoDB _id of the item they want",
 *   "offeredItem": "Description of what they are offering",
 *   "contactEmail": "buyer@example.com"
 * }
 */
app.post('/api/trades', authenticateToken, async (req, res) => {
    try {
        // Destructure request body
        const { requestedItemId, offeredItem, contactEmail } = req.body;

        // Validate required fields
        if (!requestedItemId || !offeredItem || !contactEmail) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Please provide requestedItemId, offeredItem, and contactEmail',
                receivedFields: {
                    requestedItemId: !!requestedItemId,
                    offeredItem: !!offeredItem,
                    contactEmail: !!contactEmail
                }
            });
        }

        // Create new trade document
        const newTrade = new Trade({
            requestedItemId: requestedItemId.trim(),
            offeredItem: offeredItem.trim(),
            contactEmail: contactEmail.trim(),
            status: 'Pending'
        });

        // Save trade to database
        const savedTrade = await newTrade.save();

        // Log success
        console.log(`✅ New trade offer created for item ID: ${savedTrade.requestedItemId} (Trade ID: ${savedTrade._id})`);

        // Return the saved trade with 201 Created status
        res.status(201).json({
            success: true,
            message: 'Trade offer submitted successfully',
            trade: savedTrade,
            timestamp: new Date()
        });

    } catch (error) {
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = {};
            Object.keys(error.errors).forEach(field => {
                validationErrors[field] = error.errors[field].message;
            });

            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid data provided',
                details: validationErrors
            });
        }

        // Handle other errors
        console.error('❌ Error creating trade offer:', error.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Failed to create trade offer',
            details: error.message
        });
    }
});

// -------- GET ROUTE: FETCH ALL TRADES --------
/**
 * GET /api/trades
 * Retrieve all trade offers from the database
 * 
 * Query parameters (optional):
 * - ?status=Pending (filter by status)
 * - ?limit=10 (limit results)
 * - ?skip=0 (pagination)
 * - ?sort=-createdAt (sort by field)
 */
app.get('/api/trades', async (req, res) => {
    try {
        // Extract query parameters
        const { status, limit = 100, skip = 0, sort = '-createdAt' } = req.query;

        // Build query filter
        let query = {};
        if (status) {
            query.status = status;
        }

        // Fetch trades with optional filtering, sorting, and pagination
        const trades = await Trade.find(query)
            .sort(sort)
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        // Get total count for pagination info
        const totalCount = await Trade.countDocuments(query);

        // Log success
        console.log(`✅ Fetched ${trades.length} trade(s) from database`);

        // Return trades with metadata
        res.status(200).json({
            success: true,
            message: 'Trades retrieved successfully',
            data: {
                trades: trades,
                pagination: {
                    total: totalCount,
                    returned: trades.length,
                    limit: parseInt(limit),
                    skip: parseInt(skip),
                    hasMore: parseInt(skip) + trades.length < totalCount
                }
            },
            timestamp: new Date()
        });

    } catch (error) {
        // Handle errors
        console.error('❌ Error fetching trades:', error.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Failed to fetch trades',
            details: error.message
        });
    }
});

// -------- 404 NOT FOUND ROUTE --------
/**
 * Catch all route for undefined endpoints
 */
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} does not exist`,
        suggestion: 'Use GET /api/info to see available endpoints'
    });
});

// ===========================
// ERROR HANDLING
// ===========================

/**
 * Global error handling middleware
 */
app.use((error, req, res, next) => {
    console.error('🔴 Error:', error);

    const status = error.status || 500;
    const message = error.message || 'Internal Server Error';

    res.status(status).json({
        error: {
            status: status,
            message: message
        }
    });
});

// ===========================
// SERVER STARTUP
// ===========================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║       🚀 BarterHub API Server 🚀      ║');
    console.log('╚═══════════════════════════════════════╝');
    console.log('');
    console.log(`✨ Server is running on: http://localhost:${PORT}`);
    console.log(`📡 Node Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('📚 Available Routes:');
    console.log(`   • GET http://localhost:${PORT}/api/test`);
    console.log(`   • GET http://localhost:${PORT}/api/health`);
    console.log(`   • GET http://localhost:${PORT}/api/info`);
    console.log('');
    console.log('💾 Mongoose Models Loaded:');
    console.log('   • User');
    console.log('   • Item');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('');
});

// ===========================
// GRACEFUL SHUTDOWN
// ===========================

/**
 * Handle graceful shutdown of server and database
 */
process.on('SIGINT', () => {
    console.log('');
    console.log('🛑 Shutting down server gracefully...');
    
    server.close(async () => {
        console.log('✅ Server closed');
        
        try {
            await mongoose.connection.close();
            console.log('✅ MongoDB connection closed');
        } catch (error) {
            console.error('❌ Error closing MongoDB connection:', error);
        }
        
        console.log('👋 Goodbye!');
        process.exit(0);
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔴 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('🔴 Uncaught Exception:', error);
    process.exit(1);
});

// ===========================
// EXPORT FOR TESTING
// ===========================

module.exports = { app, User, Item };
