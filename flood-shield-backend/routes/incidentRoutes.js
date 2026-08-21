const express = require('express');
const router = express.Router();
const {
  getAllIncidents,
  reportIncident,
  verifyIncident,
  approveIncident
} = require('../controllers/incidentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get all incidents (for volunteers, citizens, govt)
router.get('/', protect, getAllIncidents);

// Citizens report incidents
router.post('/', protect, reportIncident);

// Volunteers verify incidents
router.post('/:id/verify', protect, authorize(['Volunteer']), verifyIncident);

// Government officials approve incidents
router.post('/:id/approve', protect, authorize(['Government']), approveIncident);

module.exports = router;
