const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  submitDonation,
  getAllDonations,
  getDonationTotal,
  getPublicLeaderboard,
  disburseNGOFunding,
  getDisbursements,
  getNGOTreasury,
  allocateNGOFunding,
  submitFundingRequest,
  getFundingRequests,
  fulfillFundingRequest
} = require('../controllers/donationController');

router.get('/public', getPublicLeaderboard);                             // no auth — public
router.get('/disbursements', getDisbursements);                           // public/authenticated — view NGO grants history
router.post('/disburse', protect, authorize(['Government']), disburseNGOFunding); // Gov admin — disburse funding grant to NGO
router.get('/ngo-treasury', protect, authorize(['NGO']), getNGOTreasury); // NGO Admin — view treasury
router.post('/ngo-allocate', protect, authorize(['NGO']), allocateNGOFunding); // NGO Admin — distribute to Campaign/Logistics
router.get('/funding-requests', protect, getFundingRequests);
router.post('/funding-requests', protect, authorize(['GovRepresentative', 'GovRepLogistics', 'NGORepresentative', 'NGORepLogistics']), submitFundingRequest);
router.post('/funding-requests/:id/fulfill', protect, authorize(['Government', 'NGO']), fulfillFundingRequest);
router.post('/', submitDonation);                                        // public — anyone can donate
router.get('/', protect, authorize(['Government', 'GovRepresentative', 'GovRepLogistics']), getAllDonations);     // Gov & Reps
router.get('/total', protect, authorize(['Government', 'GovRepresentative', 'GovRepLogistics']), getDonationTotal); // Gov & Reps

module.exports = router;
