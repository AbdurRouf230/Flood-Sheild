const express = require('express');
const router = express.Router();
const { getHistory, postMessage, getSystemStatus, testApiKey } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.get('/history', protect, getHistory);
router.post('/message', protect, postMessage);
router.get('/status', protect, getSystemStatus);
router.post('/test-key', protect, testApiKey);

module.exports = router;
