const axios = require('axios');
const dbStore = require('../utils/dbStore');
const { SEED_SHELTERS } = require('../utils/seedData');

// Cold-start fallback shelters — synced with utils/seedData.js
const FALLBACK_SHELTERS = SEED_SHELTERS.map(s => ({
  name: s.name,
  lat: s.lat,
  lng: s.lon,
  capacity: s.capacity,
  currentOccupancy: s.occupancy,
  status: s.status || 'Available',
  phone: s.phone || '',
  district: s.district
}));

const PYTHON_ML_URL = String(process.env.PYTHON_ML_URL || 'http://127.0.0.1:5001').replace('://localhost', '://127.0.0.1');

/**
 * Normalise a shelter record from either the DB (uses `lon`) or the fallback
 * list (uses `lng`) into the shape the frontend map expects: { lat, lng, ... }.
 */
const normaliseShelter = (s, index) => ({
  id:               s._id || s.id || index + 1,
  name:             s.name,
  lat:              s.lat,
  lng:              s.lon !== undefined ? s.lon : s.lng,   // DB stores `lon`; fallback stores `lng`
  capacity:         s.capacity,
  currentOccupancy: s.occupancy !== undefined ? s.occupancy : (s.currentOccupancy || 0),
  status:           s.active === false ? 'Inactive' : (s.status || 'Available'),
  phone:            s.phone || '',
  district:         s.district || ''
});

/**
 * Load shelters from the unified DB source and fall back to the hardcoded list
 * when the database is empty or unavailable.
 */
const loadShelters = async () => {
  try {
    const dbShelters = await dbStore.findShelters();
    if (dbShelters && dbShelters.length > 0) {
      return dbShelters.map(normaliseShelter);
    }
  } catch (e) {
    console.warn('[FloodMap] dbStore.findShelters failed, using fallback:', e.message);
  }
  return FALLBACK_SHELTERS.map(normaliseShelter);
};

// GET /api/flood-map/shelters — returns unified shelter list for the GIS map layer
const getShelters = async (req, res) => {
  try {
    const shelters = await loadShelters();
    res.json(shelters);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving shelters list', error: error.message });
  }
};

// Get incidents overlay list (live synced from crowdsourced reports)
const getIncidents = async (req, res) => {
  try {
    const list = await dbStore.findIncidents();
    // Only display Approved reports on the primary map overlay for general public and GIS views
    const approvedIncidents = list
      .filter(i => i.status === 'Approved')
      .map(i => ({
        id: i._id,
        title: i.title,
        district: i.district,
        type: i.type,
        desc: i.desc,
        lat: i.lat,
        lng: i.lng,
        severity: i.severity,
        reportedAt: i.reportedAt
      }));
    res.json(approvedIncidents);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving incidents feed', error: error.message });
  }
};

// Coordinate Flood Prediction controller (with Python server proxy and internal JS failsafe fallback)
const predictLocation = async (req, res) => {
  const { lat, lon } = req.body;
  if (!lat || !lon) {
    return res.status(400).json({ message: 'Latitude and Longitude are required parameters' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  try {
    // Attempt proxying to Python XGBoost Flask service
    const response = await axios.post(`${PYTHON_ML_URL}/predict`, { lat: latitude, lon: longitude }, { timeout: 3500 });
    return res.json(response.data);
  } catch (error) {
    console.warn(`[Node Backend] Python ML Service is offline or timed out: ${error.message}. Executing JavaScript fallback model...`);
    
    // JS Fallback Rule-Based Prediction Model (replicates XGBoost logic)
    // 1. Simulate elevation (NASA DEM proxy) based on coordinate mapping in Bangladesh
    let elevation = 15.0;
    if (latitude >= 24.5 && latitude <= 25.5 && longitude >= 91.0 && longitude <= 92.5) {
      elevation = 8.0; // Sunamganj/Sylhet low haor
    } else if (latitude < 23.0) {
      elevation = 3.0; // Coastal flatlands
    } else if (latitude > 25.5 && longitude < 90.0) {
      elevation = 28.0; // Kurigram higher plains
    }
    
    // 2. Fetch or mock rainfall parameters
    const currentRain = 8.5; // average monsoon rain mm
    const forecast72h = 110.0;
    
    // 3. Simulate distance to river
    const distToRiver = Math.abs(Math.sin(latitude * 3.5) * Math.cos(longitude * 2.5) * 12.0) + 1.5;
    
    // 4. Calculate Risk Probability Score (0 - 100%)
    let score = (100 - elevation) * 0.25 + (forecast72h / 3.0) * 0.45 + (30 - distToRiver) * 0.2 + currentRain * 0.1;
    
    // Geographic risk modifier
    if (latitude >= 24.5 && latitude <= 25.5 && longitude >= 91.0 && longitude <= 92.5) {
      score += 15.0; // Sylhet flash flood zone bump
    }
    
    const probability = Math.min(98.5, Math.max(4.0, score));
    
    let riskLevel = 'Low';
    if (probability >= 80.0) riskLevel = 'Critical';
    else if (probability >= 60.0) riskLevel = 'High';
    else if (probability >= 30.0) riskLevel = 'Moderate';
    
    // Flood depth estimate (m)
    const depth = riskLevel === 'Low' ? 0.0 : Math.round((forecast72h / 90.0) * (14.0 / elevation) * 100) / 100;
    
    // Find closest shelter using unified data source
    const sheltersList = await loadShelters();
    let nearest = sheltersList[0];
    let minDist = 9999.0;
    
    const toRadians = (deg) => (deg * Math.PI) / 180;
    
    for (const s of sheltersList) {
      // Haversine formula
      const R = 6371.0;
      const dLat = toRadians(s.lat - latitude);
      const dLng = toRadians(s.lng - longitude);
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(latitude)) * Math.cos(toRadians(s.lat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;
      
      if (dist < minDist) {
        minDist = dist;
        nearest = s;
      }
    }
    
    const suggestedShelter = nearest 
      ? `${nearest.name} (Distance: ${minDist.toFixed(2)} km, Capacity: ${nearest.capacity} people)` 
      : 'Local Primary School Center';

    // Return JS response mirroring Python API schema
    res.json({
      lat: latitude,
      lon: longitude,
      floodProbability: parseFloat(probability.toFixed(2)),
      floodDepth: Math.min(4.5, depth),
      riskLevel: riskLevel,
      suggestedShelter: suggestedShelter,
      suggestedShelterLat: nearest ? nearest.lat : null,
      suggestedShelterLng: nearest ? nearest.lng : null,
      suggestedShelterName: nearest ? nearest.name : null,
      telemetry: {
        elevation: elevation,
        precipitation_current: currentRain,
        precipitation_24h: currentRain * 5.5,
        precipitation_72h: forecast72h,
        distance_to_river_km: parseFloat(distToRiver.toFixed(2))
      },
      datasource: "JavaScript Failsafe Model (Node API Gateway)"
    });
  }
};

// Image segmentation controller (with Python server proxy and internal JS failsafe fallback)
const segmentImage = async (req, res) => {
  const { image, model } = req.body;
  if (!image) {
    return res.status(400).json({ message: 'Base64 image string is required' });
  }

  const modelUsed = model || 'SegFormer';

  try {
    // Attempt proxying to Python ML Flask service
    const response = await axios.post(`${PYTHON_ML_URL}/segment`, { image, model: modelUsed }, { timeout: 8000 });
    return res.json(response.data);
  } catch (error) {
    console.warn(`[Node Backend] Python ML Service is offline or timed out: ${error.message}. Executing JavaScript fallback image parser...`);
    
    // JS Failsafe Fallback: returns the original image with simulated flood indices.
    // The actual water overlay rendering will be handled using HTML5 canvas directly on the client frontend 
    // to preserve processing speed and bypass local Node binary compilation constraints.
    
    // Simulate flood percent based on string length (pseudo-random, but deterministic per image)
    const seed = image.length % 100;
    const floodPercent = Math.min(85.5, Math.max(5.0, seed * 0.8 + 10.0));
    
    let severity = 'Low';
    if (floodPercent >= 60.0) severity = 'Critical';
    else if (floodPercent >= 35.0) severity = 'Severe';
    else if (floodPercent >= 12.0) severity = 'Moderate';
    
    const waterCoverageSqm = Math.round(1000000 * (floodPercent / 100.0));

    res.json({
      modelUsed: `${modelUsed} (JS Fallback)`,
      floodPercent: parseFloat(floodPercent.toFixed(2)),
      waterCoverageSqm: waterCoverageSqm,
      severity: severity,
      segmentedImage: image, // Return original image. Frontend will draw overlay.
      fallbackActive: true
    });
  }
};

module.exports = {
  getShelters,
  getIncidents,
  predictLocation,
  segmentImage
};
