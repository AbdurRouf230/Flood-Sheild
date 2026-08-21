const express = require('express');
const router = express.Router();
const { getAnalytics, getForecast, getDistrictRisk } = require('../controllers/decisionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Route configurations restricted strictly to the Government role
router.get('/analytics', protect, authorize(['Government']), getAnalytics);
router.get('/forecast', protect, authorize(['Government']), getForecast);
router.get('/district-risk', protect, authorize(['Government']), getDistrictRisk);

module.exports = router;
