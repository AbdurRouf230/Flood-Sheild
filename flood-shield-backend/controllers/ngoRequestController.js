const dbStore = require('../utils/dbStore');

// POST /api/ngo-requests  [NGO]
const createRequest = async (req, res) => {
  const { requestType, district, itemDetail, quantity, urgency } = req.body;
  if (!requestType || !district || !itemDetail) {
    return res.status(400).json({ message: 'requestType, district and itemDetail are required' });
  }
  try {
    const request = await dbStore.createNGORequest({
      ngoName: req.user.name,
      ngoUid: req.user.uid,
      requestType,
      district,
      itemDetail,
      quantity: quantity ? parseInt(quantity) : 1,
      urgency: urgency || 'Medium'
    });
    res.status(201).json(request);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/ngo-requests  [Government]
const getAllRequests = async (req, res) => {
  try {
    const requests = await dbStore.findNGORequests();
    res.json(requests);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/ngo-requests/mine  [NGO]
const getMyRequests = async (req, res) => {
  try {
    const requests = await dbStore.findNGORequests({ ngoUid: req.user.uid });
    res.json(requests);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// PUT /api/ngo-requests/:id  [Government]
const respondToRequest = async (req, res) => {
  const { action, govResponse } = req.body; // action: 'approve' or 'reject'
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'action must be approve or reject' });
  }
  try {
    const status = action === 'approve' ? 'Approved' : 'Rejected';
    const updated = await dbStore.updateNGORequestStatus(req.params.id, status, govResponse || '', req.user.name);
    if (!updated) return res.status(404).json({ message: 'NGO request not found' });
    res.json(updated);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

module.exports = { createRequest, getAllRequests, getMyRequests, respondToRequest };
