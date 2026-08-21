const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getCampaigns,
  createCampaign,
  updateCampaign,
  createInvite,
  listInvites,
  submitRequest,
  myRequests,
  allRequests,
  respondToRequest,
  getInventory,
  sendInviteEmail,
  createLogisticsInvite
} = require('../controllers/campaignController');

router.get('/', protect, getCampaigns);
router.post('/', protect, authorize(['NGO']), createCampaign);
router.put('/:id', protect, authorize(['NGO']), updateCampaign);
router.post('/invite', protect, authorize(['NGO']), createInvite);
router.post('/logistics-invite', protect, authorize(['NGO']), createLogisticsInvite);
router.post('/invite/send-email', protect, authorize(['NGO']), sendInviteEmail);
router.get('/invites', protect, authorize(['NGO']), listInvites);
router.post('/requests', protect, authorize(['NGORepresentative', 'NGORepLogistics']), submitRequest);
router.get('/requests/mine', protect, authorize(['NGORepresentative', 'NGORepLogistics']), myRequests);
router.get('/requests', protect, authorize(['NGO']), allRequests);
router.put('/requests/:id', protect, authorize(['NGO']), respondToRequest);
router.get('/inventory', protect, authorize(['NGORepresentative', 'NGORepLogistics']), getInventory);

module.exports = router;
