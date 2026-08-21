const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getSlots, createSlot, applyToSlot, respondToApplication, getMyApplications, getSlotApplications, getVolunteerMap, closeSlot, getAvailableVolunteers, assignTask } = require('../controllers/volunteerController');

router.get('/available', protect, getAvailableVolunteers);
router.put('/:uid/task', protect, authorize(['NGO', 'Government', 'NGORepresentative', 'GovRepresentative']), assignTask);
router.get('/slots', protect, getSlots);
router.post('/slots', protect, authorize(['NGO', 'Government']), createSlot);
router.put('/slots/:id/close', protect, authorize(['NGO', 'Government']), closeSlot);
router.post('/slots/:id/apply', protect, authorize(['Volunteer', 'Citizen']), applyToSlot);
router.put('/slots/:slotId/applications/:appId/respond', protect, authorize(['NGO', 'Government']), respondToApplication);
router.get('/applications/mine', protect, authorize(['Volunteer', 'Citizen']), getMyApplications);
router.get('/applications/slot/:slotId', protect, authorize(['NGO', 'Government']), getSlotApplications);
router.get('/map', protect, getVolunteerMap);

module.exports = router;
