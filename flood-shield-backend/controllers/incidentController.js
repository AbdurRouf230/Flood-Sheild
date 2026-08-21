const axios = require('axios');
const dbStore = require('../utils/dbStore');

const PYTHON_ML_URL = String(process.env.PYTHON_ML_URL || 'http://127.0.0.1:5001').replace('://localhost', '://127.0.0.1');

// GET /api/incidents
// Get all reported incidents
const getAllIncidents = async (req, res) => {
  try {
    const list = await dbStore.findIncidents();
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving incidents feed', error: error.message });
  }
};

// POST /api/incidents
// Report a new incident (Citizen / Volunteer / Govt)
const reportIncident = async (req, res) => {
  const { title, district, type, desc, lat, lng, image, video } = req.body;

  if (!title || !district || !type || !desc || !lat || !lng) {
    return res.status(400).json({ message: 'Title, District, Type, Description, Lat, and Lng are required fields' });
  }

  const validTypes = ['Flooded Road', 'Dam Breach', 'Trapped People', 'Shelter Need', 'Food Need'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: 'Invalid incident type' });
  }

  // Retrieve reporter info from auth middleware (protect assigns req.user)
  const reporterName = req.user ? req.user.name : 'Anonymous Citizen';

  let aiTags = [];

  // Triggers YOLOv8 Image Classification if an image is provided
  if (image) {
    try {
      console.log(`[Backend Gateway] Requesting YOLOv8 classification from Python service for report: ${title}...`);
      const response = await axios.post(`${PYTHON_ML_URL}/detect`, { image }, { timeout: 4000 });
      if (response.data && response.data.tags) {
        aiTags = response.data.tags;
        console.log(`[Backend Gateway] YOLOv8 classifications returned tags:`, aiTags);
      }
    } catch (err) {
      console.warn(`[Backend Gateway] Python ML Service YOLO detection failed: ${err.message}. Running Node.js fallback tagging...`);
      // JS Fallback Image Tags classifier logic based on reported type
      aiTags.push('Flood');
      if (type === 'Trapped People') aiTags.push('Human');
      if (type === 'Food Need' || type === 'Shelter Need') aiTags.push('Human');
      if (type === 'Flooded Road') aiTags.push('Vehicle');
    }
  } else {
    // If no image, assign base tag based on type
    aiTags.push('Flood');
    if (type === 'Trapped People') aiTags.push('Human');
  }

  try {
    const newIncident = await dbStore.createIncident({
      title,
      district,
      type,
      desc,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      image: image || null,
      video: video || null,
      severity: type === 'Dam Breach' || type === 'Trapped People' ? 'Critical' : 'High',
      reportedBy: reporterName,
      aiTags
    });

    res.status(201).json(newIncident);
  } catch (error) {
    res.status(500).json({ message: 'Failed to record crowdsourced report', error: error.message });
  }
};

// POST /api/incidents/:id/verify
// Verify a report (Volunteer role only)
const verifyIncident = async (req, res) => {
  const { id } = req.params;
  const volunteerName = req.user ? req.user.name : 'Active Volunteer';

  try {
    const updated = await dbStore.updateIncidentStatus(id, 'Verified', volunteerName, 'Volunteer');
    if (!updated) {
      return res.status(404).json({ message: 'Incident report not found' });
    }
    console.log(`Incident ${id} successfully verified by Volunteer: ${volunteerName}`);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify incident report', error: error.message });
  }
};

// POST /api/incidents/:id/approve
// Approve a report (Government role only)
const approveIncident = async (req, res) => {
  const { id } = req.params;
  const govtName = req.user ? req.user.name : 'Govt Administrator';

  try {
    const updated = await dbStore.updateIncidentStatus(id, 'Approved', govtName, 'Government');
    if (!updated) {
      return res.status(404).json({ message: 'Incident report not found' });
    }
    console.log(`Incident ${id} successfully approved by Government: ${govtName}`);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve incident report', error: error.message });
  }
};

module.exports = {
  getAllIncidents,
  reportIncident,
  verifyIncident,
  approveIncident
};
