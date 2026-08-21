const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const axios = require('axios');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const floodMapRoutes = require('./routes/floodMapRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const logisticsRoutes = require('./routes/logisticsRoutes');
const aiRoutes = require('./routes/aiRoutes');
const decisionRoutes = require('./routes/decisionRoutes');
const volunteerRoutes = require('./routes/volunteerRoutes');
const donationRoutes = require('./routes/donationRoutes');
const ngoRequestRoutes = require('./routes/ngoRequestRoutes');
const shelterRoutes = require('./routes/shelterRoutes');
const transportRoutes = require('./routes/transportRoutes');
const representativeRoutes = require('./routes/representativeRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const adminRoutes = require('./routes/adminRoutes');
const sosRoutes = require('./routes/sosRoutes');

// Load environment variables (.env)
dotenv.config();

// Initialize express app
const app = express();

// Connect database, then copy local demo records into Mongo if they are missing
connectDB().then(async () => {
  try {
    const { seedDemoDataToMongo } = require('./utils/dbStore');
    await seedDemoDataToMongo();
  } catch (e) {
    console.error('Demo seed failed:', e.message);
  }
});


// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  // Do not pin allowedHeaders. The frontend may send X-OpenAI-Key; a fixed
  // list makes the browser block the request as "Failed to fetch".
}));
app.use(express.json({ limit: '15mb' })); // Increased limit to accept base64 image uploads

// Main Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/flood-map', floodMapRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/decision', decisionRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/ngo-requests', ngoRequestRoutes);
app.use('/api/shelters', shelterRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/representatives', representativeRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sos', sosRoutes);


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date(), 
    service: 'Flood Shield Authentication Service' 
  });
  const mlUrl = String(process.env.PYTHON_ML_URL || 'http://127.0.0.1:5001').replace('://localhost', '://127.0.0.1');
  axios.get(`${mlUrl}/health`, { timeout: 8000 }).catch(() => {});
});

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({ 
    message: 'An unexpected internal server error occurred', 
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  const mlUrl = String(process.env.PYTHON_ML_URL || 'http://127.0.0.1:5001').replace('://localhost', '://127.0.0.1');
  axios.get(`${mlUrl}/health`, { timeout: 8000 }).catch(() => {});
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process or set PORT to a different value.`);
    process.exit(1);
  }
  console.error('Server failed to start:', err.message);
  process.exit(1);
});
