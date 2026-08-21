const express = require('express');
const router = express.Router();
const {
  getInventory,
  getRequests,
  createRequest,
  allocateRelief,
  optimizeRoute,
  predictDemand,
  restockInventory
} = require('../controllers/logisticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Define routes with Role-Based Access Control
router.get('/inventory', protect, getInventory);
router.get('/requests', protect, getRequests);
router.post('/requests', protect, createRequest);
router.post('/allocate', protect, authorize(['Government', 'NGO', 'NGORepresentative', 'GovRepresentative', 'GovRepLogistics', 'NGORepLogistics']), allocateRelief);
router.post('/optimize-route', protect, optimizeRoute);
router.post('/predict-demand', protect, predictDemand);
router.post('/inventory/restock', protect, authorize(['Government', 'NGO', 'NGORepresentative', 'GovRepresentative', 'GovRepLogistics', 'NGORepLogistics']), restockInventory);

module.exports = router;
