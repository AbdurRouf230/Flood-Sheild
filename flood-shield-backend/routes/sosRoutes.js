const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  triggerSOS,
  getActiveSOS,
  getVolunteersLocation,
  getSOSById,
  respondSOS,
  withdrawSOSDispatch,
  postSOSMessage,
  updateLocation,
  updateStatus
} = require('../controllers/sosController');

router.get('/', protect, getActiveSOS);
router.get('/volunteers', protect, getVolunteersLocation);
router.post('/trigger', protect, triggerSOS);
router.get('/:id', protect, getSOSById);
router.post('/:id/respond', protect, respondSOS);
router.delete('/:id/dispatches/:dispatchId', protect, withdrawSOSDispatch);
router.post('/:id/chat', protect, postSOSMessage);
router.put('/:id/location', protect, updateLocation);
router.put('/:id/status', protect, updateStatus);

module.exports = router;
