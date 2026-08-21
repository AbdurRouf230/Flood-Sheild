const axios = require('axios');
const dbStore = require('../utils/dbStore');

const PYTHON_ML_URL = String(process.env.PYTHON_ML_URL || 'http://127.0.0.1:5001').replace('://localhost', '://127.0.0.1');

// GET /api/decision/analytics
const getAnalytics = async (req, res) => {
  try {
    const [inventory, requests, incidents, allocations] = await Promise.all([
      dbStore.findInventory(),
      dbStore.findReliefRequests(),
      dbStore.findIncidents(),
      dbStore.findAllocations()
    ]);

    // 1. Inventory Summary by ItemType
    const inventorySummary = { Food: 0, Water: 0, Medicine: 0, 'Shelter Kits': 0 };
    inventory.forEach(item => {
      if (inventorySummary[item.itemType] !== undefined) {
        inventorySummary[item.itemType] += item.quantity;
      }
    });

    // 2. Requests Summary by ItemType and Status
    const requestsSummary = {
      total: requests.length,
      byStatus: { Pending: 0, Approved: 0, Dispatched: 0, Delivered: 0 },
      byItemType: { Food: 0, Water: 0, Medicine: 0, 'Shelter Kits': 0 }
    };
    requests.forEach(reqItem => {
      if (requestsSummary.byStatus[reqItem.status] !== undefined) {
        requestsSummary.byStatus[reqItem.status]++;
      }
      if (requestsSummary.byItemType[reqItem.itemType] !== undefined) {
        requestsSummary.byItemType[reqItem.itemType] += reqItem.quantity;
      }
    });

    // 3. Incidents Summary
    const incidentsSummary = {
      total: incidents.length,
      byStatus: { Pending: 0, Verified: 0, Approved: 0 },
      bySeverity: { Critical: 0, High: 0, Moderate: 0, Low: 0 }
    };
    incidents.forEach(inc => {
      if (incidentsSummary.byStatus[inc.status] !== undefined) {
        incidentsSummary.byStatus[inc.status]++;
      }
      if (incidentsSummary.bySeverity[inc.severity] !== undefined) {
        incidentsSummary.bySeverity[inc.severity]++;
      }
    });

    // 4. Allocation Summary
    let totalAllocatedQuantity = 0;
    allocations.forEach(alloc => {
      alloc.allocatedItems.forEach(item => {
        totalAllocatedQuantity += item.quantity;
      });
    });

    // 5. Predefined shelters mapping capacity info (matching python list)
    const totalShelters = 12;
    const totalShelterCapacity = 11700; // sum of capacity of 12 shelters
    
    // Simulate current shelter occupancy levels (approx 55% average occupancy)
    const occupancyPercentage = 54.5;
    const occupiedCapacity = Math.round(totalShelterCapacity * (occupancyPercentage / 100));

    res.json({
      inventorySummary,
      requestsSummary,
      incidentsSummary,
      allocationSummary: {
        totalAllocatedCount: allocations.length,
        totalAllocatedQuantity,
        allocationsList: allocations
      },
      shelterSummary: {
        totalShelters,
        totalCapacity: totalShelterCapacity,
        occupiedCapacity,
        occupancyPercentage
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving decision support analytics', error: error.message });
  }
};

// GET /api/decision/forecast
const getForecast = async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_ML_URL}/decision/forecast`, { timeout: 3000 });
    res.json(response.data);
  } catch (error) {
    console.warn(`[Node Backend] Python ML Forecast service offline: ${error.message}. Returning fallback timeseries data...`);
    
    // Fallback: 7 days historical + forecasted water level measurements for major rivers in Bangladesh
    const stations = [
      {
        station: "Sylhet (Surma River)",
        dangerLevel: 11.25,
        history: [10.8, 10.95, 11.1, 11.3, 11.2, 11.45, 11.6],
        forecast: [11.8, 11.95, 12.1, 11.9, 11.75, 11.5, 11.3]
      },
      {
        station: "Sunamganj (Meghna Basin)",
        dangerLevel: 8.5,
        history: [8.1, 8.3, 8.45, 8.6, 8.8, 8.95, 9.15],
        forecast: [9.3, 9.45, 9.35, 9.2, 9.0, 8.85, 8.6]
      },
      {
        station: "Kurigram (Brahmaputra River)",
        dangerLevel: 26.5,
        history: [25.8, 26.1, 26.3, 26.6, 26.8, 27.1, 27.45],
        forecast: [27.7, 27.9, 28.1, 27.8, 27.4, 27.05, 26.7]
      }
    ];

    res.json({
      stations,
      forecastedDays: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"],
      solverUsed: 'Node.js Timeseries Fallback Engine (ML Service Offline)'
    });
  }
};

// GET /api/decision/district-risk
const getDistrictRisk = async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_ML_URL}/decision/district-risk`, { timeout: 3000 });
    res.json(response.data);
  } catch (error) {
    console.warn(`[Node Backend] Python ML District Risk service offline: ${error.message}. Returning fallback risk scores...`);
    
    // Fallback district risk rankings
    const rankings = [
      { district: "Sunamganj", riskScore: 92.5, level: "Critical", rainfall72h: 120.0, elevation: 12.0, proximityKm: 1.2 },
      { district: "Sylhet", riskScore: 88.0, level: "Critical", rainfall72h: 95.0, elevation: 15.0, proximityKm: 2.5 },
      { district: "Kurigram", riskScore: 82.3, level: "Critical", rainfall72h: 110.0, elevation: 28.0, proximityKm: 0.8 },
      { district: "Gaibandha", riskScore: 74.5, level: "High", rainfall72h: 85.0, elevation: 24.0, proximityKm: 1.5 },
      { district: "Sirajganj", riskScore: 68.0, level: "High", rainfall72h: 75.0, elevation: 16.0, proximityKm: 1.1 },
      { district: "Netrokona", riskScore: 62.1, level: "High", rainfall72h: 70.0, elevation: 18.0, proximityKm: 3.2 },
      { district: "Jamalpur", riskScore: 56.4, level: "Moderate", rainfall72h: 60.0, elevation: 20.0, proximityKm: 2.1 },
      { district: "Bogura", riskScore: 48.0, level: "Moderate", rainfall72h: 55.0, elevation: 22.0, proximityKm: 4.5 },
      { district: "Chittagong", riskScore: 35.5, level: "Moderate", rainfall72h: 40.0, elevation: 10.0, proximityKm: 6.0 },
      { district: "Dhaka", riskScore: 18.2, level: "Low", rainfall72h: 20.0, elevation: 8.0, proximityKm: 8.5 }
    ];

    res.json({
      rankings,
      ensembleFormula: 'Vulnerability = (Rainfall * 0.4) + (Elevation_Inv * 0.3) + (River_Proximity_Inv * 0.2) + (Density_Weight * 0.1)',
      solverUsed: 'Node.js Local Ensemble Heuristics (ML Service Offline)'
    });
  }
};

module.exports = {
  getAnalytics,
  getForecast,
  getDistrictRisk
};
