const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getShelters, addShelter, editShelter, createGovInvite, createGovLogisticsInvite, listGovInvites, sendInviteEmail } = require('../controllers/shelterController');

router.get('/', getShelters);                                           // public — used by ML and map
router.post('/', protect, authorize(['Government']), addShelter);       // Gov only
router.put('/:id', protect, authorize(['Government']), editShelter);    // Gov only
router.post('/invite', protect, authorize(['Government']), createGovInvite);
router.post('/logistics-invite', protect, authorize(['Government']), createGovLogisticsInvite);
router.post('/invite/send-email', protect, authorize(['Government']), sendInviteEmail);
router.get('/invites', protect, authorize(['Government']), listGovInvites);

module.exports = router;
