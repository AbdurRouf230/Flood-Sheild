const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { createRequest, getAllRequests, getMyRequests, respondToRequest } = require('../controllers/ngoRequestController');

router.post('/', protect, authorize(['NGO']), createRequest);
router.get('/', protect, authorize(['Government']), getAllRequests);
router.get('/mine', protect, authorize(['NGO']), getMyRequests);
router.put('/:id', protect, authorize(['Government']), respondToRequest);

module.exports = router;
