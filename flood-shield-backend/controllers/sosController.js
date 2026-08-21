const dbStore = require('../utils/dbStore');

// POST /api/sos/trigger — Citizen triggers emergency SOS
const triggerSOS = async (req, res) => {
  const { latitude, longitude, district, villageName, message, urgency, imageUrl, phone } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'GPS Latitude and Longitude coordinates are required to dispatch SOS' });
  }

  try {
    const sos = await dbStore.createSOSAlert({
      citizenUid: req.user?.uid || 'anon-cit',
      citizenName: req.user?.name || 'Citizen in Distress',
      citizenPhone: phone || req.user?.phone || '+8801711223344',
      citizenEmail: req.user?.email || '',
      district: district || req.user?.district || 'Sylhet',
      villageName: villageName || '',
      latitude: Number(latitude),
      longitude: Number(longitude),
      message: message || '🔴 Emergency SOS: Urgent Rescue Boat & Medical Evacuation Required!',
      imageUrl: imageUrl || '',
      urgency: urgency || 'Critical',
      status: 'Active SOS',
      messages: [{
        senderUid: req.user?.uid || 'anon-cit',
        senderName: req.user?.name || 'Citizen',
        senderRole: req.user?.role || 'Citizen',
        text: message || '🔴 Emergency SOS triggered! Standing by at GPS location.',
        imageUrl: imageUrl || '',
        timestamp: new Date()
      }]
    });

    res.status(201).json({
      message: '🚨 Emergency SOS signal broadcasted! Nearby rescue volunteers are notified.',
      sos
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/sos — List all SOS alerts
const getActiveSOS = async (req, res) => {
  try {
    const alerts = await dbStore.findSOSAlerts();
    res.json(alerts);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/sos/volunteers — Get list of active volunteers with GPS locations
const getVolunteersLocation = async (req, res) => {
  try {
    const users = await dbStore.findUsersByRoles(['Volunteer', 'NGORepresentative', 'GovRepresentative', 'NGO']);
    const list = users.map((u, idx) => ({
      uid: u.uid || `vol-${idx}`,
      name: u.name,
      email: u.email,
      phone: u.phone || '+8801811998877',
      role: u.role,
      district: u.district || 'Sylhet',
      orgName: u.orgName || 'Disaster Rescue Squad',
      latitude: u.latitude || (24.8960 + (idx * 0.004)),
      longitude: u.longitude || (91.8740 + (idx * 0.005)),
      status: u.status || 'Active On-Duty'
    }));
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/sos/:id — Get SOS details with live radar & chat
const getSOSById = async (req, res) => {
  try {
    const sos = await dbStore.getSOSAlertById(req.params.id);
    if (!sos) return res.status(404).json({ message: 'SOS Alert session not found' });
    res.json(sos);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// POST /api/sos/:id/respond — Representative/Volunteer dispatches single volunteer or group
const respondSOS = async (req, res) => {
  const { 
    dispatchType, groupName, groupLeaderUid, groupLeaderName, groupLeaderPhone, teamMembers,
    latitude, longitude, phone, volunteerUid, volunteerName,
    logoUrl,          // Team logo URL (for group dispatches)
    shelterLatitude,  // Shelter/campaign location lat (used as group marker location)
    shelterLongitude  // Shelter/campaign location lon
  } = req.body;
  try {
    const isGroup = dispatchType === 'Group';
    const leaderName = isGroup ? (groupLeaderName || 'Group Leader') : (volunteerName || req.user?.name || 'Volunteer');
    const leaderPhone = isGroup ? (groupLeaderPhone || '+8801811998877') : (phone || req.user?.phone || '+8801811998877');

    // For groups: location = shelter location. For single: location = volunteer GPS.
    const dispatchLat = isGroup
      ? (shelterLatitude ? Number(shelterLatitude) : (latitude ? Number(latitude) : null))
      : (latitude ? Number(latitude) : null);
    const dispatchLon = isGroup
      ? (shelterLongitude ? Number(shelterLongitude) : (longitude ? Number(longitude) : null))
      : (longitude ? Number(longitude) : null);

    const sos = await dbStore.respondToSOS(req.params.id, {
      dispatchType: isGroup ? 'Group' : 'Single',
      groupName: isGroup ? (groupName || 'Rescue Team Squad') : '',
      groupLeaderUid: isGroup ? groupLeaderUid : (volunteerUid || req.user?.uid || 'vol-1'),
      groupLeaderName: leaderName,
      groupLeaderPhone: leaderPhone,
      teamMembers: isGroup ? (teamMembers || []) : [],
      uid: isGroup ? groupLeaderUid : (volunteerUid || req.user?.uid || 'vol-1'),
      name: isGroup ? `[GROUP] ${groupName || 'Rescue Team Squad'} (Leader: ${leaderName})` : leaderName,
      phone: leaderPhone,
      latitude: dispatchLat,
      longitude: dispatchLon,
      logoUrl: isGroup ? (logoUrl || '') : '',                        // Logo for group marker
      dispatchedBy: req.user?.name || 'Rescue Dispatcher',
      dispatchedByUid: req.user?.uid || '',
      dispatchedByRole: req.user?.role || 'Volunteer'
    });

    if (!sos) return res.status(404).json({ message: 'SOS session not found' });

    const messageText = isGroup 
      ? `🛸 Group Rescue Squad "${groupName}" (Leader: ${leaderName}, Members: ${teamMembers?.length || 1}) has been dispatched to your location! Group Leader's GPS location is active on the radar map.`
      : `🛸 Rescue Officer ${leaderName} has been dispatched to your SOS and is en-route! Live location & chat active.`;

    // Auto post initial dispatch message
    await dbStore.addSOSMessage(req.params.id, {
      senderUid: req.user?.uid || 'rep-1',
      senderName: req.user?.name || 'Rescue Dispatcher',
      senderRole: req.user?.role || 'Volunteer',
      text: messageText,
      imageUrl: ''
    });

    const updated = await dbStore.getSOSAlertById(req.params.id);
    res.json({ message: 'Rescue team dispatched successfully!', sos: updated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const STAFF_ROLES = ['Government', 'NGO', 'GovRepresentative', 'NGORepresentative', 'GovRepLogistics', 'NGORepLogistics'];

const canWithdrawDispatch = (user, dispatch) => {
  if (!user || !dispatch) return false;
  if (STAFF_ROLES.includes(user.role)) return true;
  const uid = String(user.uid || '');
  if (dispatch.dispatchType === 'Group') {
    if (String(dispatch.volunteerUid || '') === uid) return true;
    if (String(dispatch.dispatchedByUid || '') === uid) return true;
    return (dispatch.teamMembers || []).some(m => String(m.uid) === uid);
  }
  return String(dispatch.volunteerUid || '') === uid;
};

// DELETE /api/sos/:id/dispatches/:dispatchId — volunteer, team, rep, or admin withdraws a dispatch
const withdrawSOSDispatch = async (req, res) => {
  try {
    const sos = await dbStore.getSOSAlertById(req.params.id);
    if (!sos) return res.status(404).json({ message: 'SOS session not found' });

    const dispatch = (sos.dispatches || []).find(d => String(d._id) === String(req.params.dispatchId));
    if (!dispatch) return res.status(404).json({ message: 'Dispatch not found' });

    if (!canWithdrawDispatch(req.user, dispatch)) {
      return res.status(403).json({ message: 'You cannot withdraw this dispatch.' });
    }

    const result = await dbStore.withdrawDispatch(req.params.id, req.params.dispatchId);
    if (!result || result.notFound) return res.status(404).json({ message: 'Dispatch not found' });

    const label = dispatch.dispatchType === 'Group'
      ? `Rescue team "${dispatch.groupName || 'Team'}"`
      : (dispatch.volunteerName || 'Volunteer');

    await dbStore.addSOSMessage(req.params.id, {
      senderUid: req.user?.uid || 'user-1',
      senderName: req.user?.name || 'Responder',
      senderRole: req.user?.role || 'Volunteer',
      text: `${label} withdrew from this SOS and is no longer en-route.`,
      imageUrl: ''
    });

    const updated = await dbStore.getSOSAlertById(req.params.id);
    res.json({ message: 'Dispatch withdrawn.', sos: updated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};


// POST /api/sos/:id/chat — Citizen or Volunteer posts chat message with optional image
const postSOSMessage = async (req, res) => {
  const { text, imageUrl } = req.body;
  if (!text && !imageUrl) {
    return res.status(400).json({ message: 'Message text or image attachment is required' });
  }

  try {
    const updated = await dbStore.addSOSMessage(req.params.id, {
      senderUid: req.user?.uid || 'user-1',
      senderName: req.user?.name || 'User',
      senderRole: req.user?.role || 'Citizen',
      text: (text || '').trim(),
      imageUrl: imageUrl || ''
    });

    if (!updated) return res.status(404).json({ message: 'SOS session not found' });
    res.status(201).json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// PUT /api/sos/:id/location — Citizen or Volunteer updates live GPS coordinates
const updateLocation = async (req, res) => {
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Valid latitude and longitude coordinates required' });
  }

  try {
    const updated = await dbStore.updateSOSLocation(req.params.id, req.user?.role, latitude, longitude);
    if (!updated) return res.status(404).json({ message: 'SOS session not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// PUT /api/sos/:id/status — Mark SOS resolved or cancelled
const updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: 'Status parameter is required' });

  try {
    const updated = await dbStore.updateSOSStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ message: 'SOS session not found' });
    res.json({ message: `SOS session marked as ${status}.`, sos: updated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = {
  triggerSOS,
  getActiveSOS,
  getVolunteersLocation,
  getSOSById,
  respondSOS,
  withdrawSOSDispatch,
  postSOSMessage,
  updateLocation,
  updateStatus
};
