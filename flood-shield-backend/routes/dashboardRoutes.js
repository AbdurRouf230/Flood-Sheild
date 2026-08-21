const express = require('express');
const router = express.Router();
const {
  getOverview,
  getRainfall,
  getRivers,
  getRiskRanking,
  getPopulation,
  getAlerts,
  getAISummary
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

// Dashboard endpoints (protect middleware ensures user must be logged in to access intel)
router.get('/overview', protect, getOverview);
router.get('/rainfall', protect, getRainfall);
router.get('/rivers', protect, getRivers);
router.get('/risk-ranking', protect, getRiskRanking);
router.get('/population', protect, getPopulation);
router.get('/alerts', protect, getAlerts);
router.get('/ai-summary', protect, getAISummary);

module.exports = router;
