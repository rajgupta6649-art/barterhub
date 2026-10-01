const Item = require('../models/Item');

// Create item
exports.createItem = async (req, res) => {
  try {
    const { title, description, category, condition, preferredTrades, location } = req.body;

    const item = await Item.create({
      title,
      description,
      category,
      condition,
      preferredTrades: preferredTrades ? preferredTrades.split(',') : [],
      location,
      owner: req.user.id,
      images: []
    });

    res.status(201).json({
      success: true,
      message: 'Item listed successfully',
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating item',
      error: error.message
    });
  }
};

// Get all items
exports.getAllItems = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, condition, status = 'available', search } = req.query;

    let query = { status };

    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const items = await Item.find(query)
      .populate('owner', 'name avatar location')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Item.countDocuments(query);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      pages: Math.ceil(total / limit),
      items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching items',
      error: error.message
    });
  }
};

// Get single item
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('owner', 'name avatar stats email phone');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.status(200).json({
      success: true,
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching item',
      error: error.message
    });
  }
};

// Update item
exports.updateItem = async (req, res) => {
  try {
    const { title, description, category, condition, preferredTrades, location, status } = req.body;

    let item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check authorization
    if (item.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
    }

    item = await Item.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        category,
        condition,
        preferredTrades: preferredTrades ? preferredTrades.split(',') : item.preferredTrades,
        location,
        status
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating item',
      error: error.message
    });
  }
};

// Delete item
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check authorization
    if (item.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this item'
      });
    }

    await Item.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting item',
      error: error.message
    });
  }
};

// Like/Unlike item
exports.toggleLike = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    const isLiked = item.likes.includes(req.user.id);

    if (isLiked) {
      item.likes.pull(req.user.id);
    } else {
      item.likes.push(req.user.id);
    }

    await item.save();

    res.status(200).json({
      success: true,
      message: isLiked ? 'Item removed from wishlist' : 'Item added to wishlist',
      isLiked: !isLiked
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error toggling like',
      error: error.message
    });
  }
};

// Get user's items
exports.getUserItems = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const items = await Item.find({ owner: req.user.id })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Item.countDocuments({ owner: req.user.id });

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      pages: Math.ceil(total / limit),
      items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching items',
      error: error.message
    });
  }
};
