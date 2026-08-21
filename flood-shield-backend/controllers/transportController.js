const dbStore = require('../utils/dbStore');

// GET /api/transport  [NGO, Government, Volunteer, GovRepresentative, NGORepresentative]
const getTransports = async (req, res) => {
  try {
    let list = await dbStore.findTransports();
    // Volunteers only see transports they are assigned to (by UID or name fallback)
    if (req.user?.role === 'Volunteer') {
      const uid = req.user?.uid || '';
      const rawName = (req.user?.name || '').toLowerCase();
      const baseName = rawName.replace(/^\[.*?\]\s*/, '').trim();
      const firstName = baseName.split(' ')[0]; // e.g. "fatema"

      list = list.filter(t =>
        (t.assignedVolunteers || []).some(v => {
          // 1. Exact UID match
          if (uid && v.volunteerUid === uid) return true;
          // 2. Name-based fallback — compare first name token (handles [GOV]/[BRAC] prefix differences)
          if (firstName && firstName.length >= 3) {
            const vBase = (v.volunteerName || '').toLowerCase().replace(/^\[.*?\]\s*/, '').trim();
            if (vBase && vBase.includes(firstName)) return true;
          }
          return false;
        })
      );
    }
    res.json(list);
  } catch (e) { res.status(500).json({ message: e.message }); }
};



// POST /api/transport  [NGO, Government]
const createTransport = async (req, res) => {
  const { district, origin, destination, itemsSummary, estimatedArrival, allocationId } = req.body;
  if (!district || !origin || !destination) {
    return res.status(400).json({ message: 'district, origin and destination are required' });
  }
  try {
    const transport = await dbStore.createTransport({
      allocationId: allocationId || '',
      district,
      origin,
      destination,
      itemsSummary: itemsSummary || '',
      estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : new Date(Date.now() + 6 * 3600000),
      addedBy: req.user.name,
      addedByRole: req.user.role
    });
    res.status(201).json(transport);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// PUT /api/transport/:id/status  [NGO, Government]
const updateStatus = async (req, res) => {
  const { status, dispatchedByText } = req.body;
  const valid = ['Pending', 'In Transit', 'Delivered', 'Cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ message: `status must be one of: ${valid.join(', ')}` });
  try {
    const transport = await dbStore.updateTransportStatus(req.params.id, status, dispatchedByText);
    if (!transport) return res.status(404).json({ message: 'Transport not found' });
    res.json(transport);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/transport/:id/assign  [NGO, Government]
const assignVolunteer = async (req, res) => {
  const { volunteerUid, volunteerName } = req.body;
  if (!volunteerUid || !volunteerName) {
    return res.status(400).json({ message: 'volunteerUid and volunteerName are required' });
  }
  try {
    const transport = await dbStore.assignVolunteerToTransport(req.params.id, { volunteerUid, volunteerName });
    if (!transport) return res.status(404).json({ message: 'Transport not found' });
    res.json(transport);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/transport/:id/chat  [NGO, Government, Volunteer]
const getChat = async (req, res) => {
  try {
    const transports = await dbStore.findTransports();
    const transport = transports.find(t => t._id.toString() === req.params.id);
    if (!transport) return res.status(404).json({ message: 'Transport not found' });
    res.json(transport.chat || []);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/transport/:id/chat  [NGO, Government, Volunteer]
const postChat = async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ message: 'text is required' });
  try {
    const transport = await dbStore.addTransportChatMessage(req.params.id, {
      senderName: req.user.name,
      senderRole: req.user.role,
      text: text.trim()
    });
    if (!transport) return res.status(404).json({ message: 'Transport not found' });
    res.status(201).json(transport.chat[transport.chat.length - 1] || {});
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/transport/auto-assign  [Government]
// Returns districts with approved incidents but no volunteers assigned in open transports
const autoAssignSuggestions = async (req, res) => {
  try {
    const incidents = await dbStore.findIncidents();
    const transports = await dbStore.findTransports();
    const slots = await dbStore.findVolunteerSlots();

    // Districts with approved incidents
    const approvedDistricts = {};
    incidents.filter(i => i.status === 'Approved').forEach(i => {
      approvedDistricts[i.district] = (approvedDistricts[i.district] || 0) + 1;
    });

    // Districts that already have volunteers in transit
    const coveredDistricts = new Set();
    transports.filter(t => t.status === 'In Transit' && t.assignedVolunteers.length > 0)
      .forEach(t => coveredDistricts.add(t.district));

    // Open volunteer slots with accepted volunteers
    const availableVolunteers = [];
    slots.filter(s => s.status === 'Open' && s.assignedVolunteers.length > 0).forEach(s => {
      s.assignedVolunteers.forEach(v => availableVolunteers.push({ ...v, district: s.district, taskType: s.taskType }));
    });

    const suggestions = Object.entries(approvedDistricts)
      .filter(([d]) => !coveredDistricts.has(d))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([district, incidentCount]) => ({
        district,
        incidentCount,
        suggestedVolunteers: availableVolunteers.filter(v => v.district === district || true).slice(0, 3),
        reason: `${incidentCount} approved incident(s) — no active transport coverage`
      }));

    res.json(suggestions);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/transport/:id/receive  [GovRepresentative]
// PUT /api/transport/:id/load [NGORepresentative, NGO, Government]
const updateLoadStatus = async (req, res) => {
  const { loadStatus, assignedHub } = req.body;
  if (!['Not Loaded', 'Loaded'].includes(loadStatus)) {
    return res.status(400).json({ message: 'loadStatus must be Loaded or Not Loaded' });
  }
  try {
    const transport = await dbStore.updateTransportLoadStatus(req.params.id, loadStatus, assignedHub);
    if (!transport) return res.status(404).json({ message: 'Transport not found' });
    res.json(transport);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/transport/:id/receive  [GovRepresentative, NGORepresentative, NGO, Government]
const receiveShipment = async (req, res) => {
  try {
    const result = await dbStore.receiveTransportForRepresentative(req.params.id, req.user);
    if (result.error) return res.status(400).json({ message: result.error });
    res.json(result);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

module.exports = { getTransports, createTransport, updateStatus, updateLoadStatus, assignVolunteer, getChat, postChat, autoAssignSuggestions, receiveShipment };
