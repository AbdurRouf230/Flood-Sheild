const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getTransports, createTransport, updateStatus, updateLoadStatus, assignVolunteer, getChat, postChat, autoAssignSuggestions, receiveShipment } = require('../controllers/transportController');

router.get('/', protect, authorize(['NGO', 'Government', 'Volunteer', 'GovRepresentative', 'NGORepresentative', 'GovRepLogistics', 'NGORepLogistics']), getTransports);
router.post('/', protect, authorize(['NGO', 'Government', 'GovRepresentative', 'NGORepresentative', 'GovRepLogistics', 'NGORepLogistics']), createTransport);
router.put('/:id/status', protect, authorize(['NGO', 'Government', 'NGORepresentative', 'GovRepresentative', 'GovRepLogistics', 'NGORepLogistics', 'Volunteer']), updateStatus);
router.put('/:id/load', protect, authorize(['NGO', 'Government', 'GovRepresentative', 'NGORepresentative', 'GovRepLogistics', 'NGORepLogistics']), updateLoadStatus);
router.post('/:id/receive', protect, authorize(['GovRepresentative', 'NGORepresentative', 'NGO', 'Government', 'GovRepLogistics', 'NGORepLogistics', 'Volunteer']), receiveShipment);
router.post('/:id/assign', protect, authorize(['NGO', 'Government', 'GovRepresentative', 'GovRepLogistics', 'NGORepresentative', 'NGORepLogistics']), assignVolunteer);

router.get('/auto-assign', protect, authorize(['Government']), autoAssignSuggestions);
router.get('/:id/chat', protect, authorize(['NGO', 'Government', 'Volunteer', 'GovRepresentative', 'NGORepresentative', 'GovRepLogistics', 'NGORepLogistics']), getChat);
router.post('/:id/chat', protect, authorize(['NGO', 'Government', 'Volunteer', 'GovRepresentative', 'NGORepresentative', 'GovRepLogistics', 'NGORepLogistics']), postChat);

module.exports = router;
