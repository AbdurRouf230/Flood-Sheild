const express = require('express');
const router = express.Router();
const {
  getShelters,
  getIncidents,
  predictLocation,
  segmentImage
} = require('../controllers/floodMapController');
const { protect } = require('../middleware/authMiddleware');

// Get geographic overlays
router.get('/shelters', protect, getShelters);
router.get('/incidents', protect, getIncidents);

// Perform ML predictions (proxies to Python ML service with JS fallback)
router.post('/predict', protect, predictLocation);
router.post('/segment', protect, segmentImage);

module.exports = router;
