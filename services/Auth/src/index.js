// Import routes
const userRoutes = require('./routes/userRoutes');
const locationRoutes = require('./routes/locationRoutes');

// ...existing code...

// Routes
app.use('/api/auth', userRoutes); // All auth endpoints (login, register, etc.)
app.use('/api/locations', locationRoutes);

// ...existing code...