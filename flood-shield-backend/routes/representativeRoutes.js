const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createInvite,
  listInvites,
  submitRequest,
  myRequests,
  allRequests,
  respondToRequest,
  respondFunding,
  getInventory,
  myTransports
} = require('../controllers/representativeController');

router.post('/invite', protect, authorize(['Government']), createInvite);
router.get('/invites', protect, authorize(['Government']), listInvites);
router.post('/requests', protect, authorize(['GovRepresentative', 'GovRepLogistics']), submitRequest);
router.get('/requests/mine', protect, authorize(['GovRepresentative', 'GovRepLogistics']), myRequests);
router.get('/requests', protect, authorize(['Government', 'NGO']), allRequests);
router.put('/requests/:id/funding', protect, authorize(['Government', 'NGO']), respondFunding);
router.put('/requests/:id', protect, authorize(['Government', 'NGO']), respondToRequest);
router.get('/inventory', protect, authorize(['GovRepresentative', 'GovRepLogistics']), getInventory);
router.get('/transports', protect, authorize(['GovRepresentative', 'GovRepLogistics', 'NGORepresentative', 'NGORepLogistics']), myTransports);

module.exports = router;
