const Order = require('../../src/model/order.js');
const path = require('path');

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    // Handle file uploads
    const pictures = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // Store the relative path to be accessed via API
        const imagePath = `/uploads/${file.filename}`;
        pictures.push(imagePath);
      });
    }

    // Merge file paths with other data
    const orderData = { 
      ...req.body,
      // Use pictures field from the schema, not images
      pictures: pictures
    };

    const order = new Order(orderData);
    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all orders (admin)
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get orders by userId
exports.getOrdersByUserId = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get orders for current user
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Search orders by various fields
exports.searchOrders = async (req, res) => {
  try {
    const { id, uniqueId, confinedSpaceNameOrId, building, dateOfSurvey } = req.query;
    const query = {};

    if (id) {
      query.$or = [
        { _id: { $regex: id, $options: "i" } },
        { uniqueId: { $regex: id, $options: "i" } }
      ];
    }
    if (uniqueId) {
      query.uniqueId = { $regex: uniqueId, $options: "i" };
    }
    if (confinedSpaceNameOrId) {
      query.confinedSpaceNameOrId = { $regex: confinedSpaceNameOrId, $options: "i" };
    }
    if (building) {
      query.building = { $regex: building, $options: "i" };
    }
    // --- Date filter: match only date part ---
    if (dateOfSurvey) {
      // Parse the date string and create a range for the whole day
      const start = new Date(dateOfSurvey);
      const end = new Date(dateOfSurvey);
      end.setDate(end.getDate() + 1);
      query.dateOfSurvey = { $gte: start, $lt: end };
    }

    const orders = await Order.find(query).sort({ dateOfSurvey: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error searching orders", error: error.message });
  }
};

// Get a single order by id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update an order by ID
exports.updateOrder = async (req, res) => {
  try {
    // Get existing order to handle pictures
    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) return res.status(404).json({ error: 'Order not found' });
    
    // Process new uploaded files, if any
    let pictures = existingOrder.pictures || [];
    
    // Add new pictures if files are uploaded
    if (req.files && req.files.length > 0) {
      const newPictures = req.files.map(file => `/uploads/${file.filename}`);
      
      // Check if we need to replace or append
      if (req.body.replaceImages === 'true') {
        pictures = newPictures;
      } else {
        pictures = [...pictures, ...newPictures];
      }
    }
    
    // Handle existing pictures array from request body (might be JSON string)
    if (req.body.pictures && typeof req.body.pictures === 'string') {
      try {
        // If it's a JSON string, parse it
        const parsedPictures = JSON.parse(req.body.pictures);
        if (Array.isArray(parsedPictures)) {
          pictures = parsedPictures;
        }
      } catch (e) {
        // If not JSON, it might be a comma-separated string
        if (req.body.pictures.includes(',')) {
          pictures = req.body.pictures.split(',');
        } else {
          // Single value
          pictures = [req.body.pictures];
        }
      }
    }
    
    // Prepare update data
    const updateData = {
      ...req.body,
      pictures
    };
    
    // Remove any JSON stringified fields that might cause issues
    delete updateData.pictures_json;
    delete updateData.replaceImages;
    
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete an order by ID
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
