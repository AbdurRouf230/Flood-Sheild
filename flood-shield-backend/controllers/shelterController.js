const dbStore = require('../utils/dbStore');
const { recordMatchesId } = require('../utils/idMatch');

// GET /api/shelters  — public
const getShelters = async (req, res) => {
  try {
    const shelters = await dbStore.findShelters();
    res.json(shelters);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/shelters  [Government]
const addShelter = async (req, res) => {
  const { name, lat, lon, capacity, district } = req.body;
  if (!name || lat === undefined || lon === undefined || !capacity || !district) {
    return res.status(400).json({ message: 'name, lat, lon, capacity and district are required' });
  }
  try {
    const shelter = await dbStore.createShelter({
      name,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      capacity: parseInt(capacity),
      district,
      addedBy: req.user.name
    });
    res.status(201).json(shelter);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// PUT /api/shelters/:id  [Government]
const editShelter = async (req, res) => {
  const allowed = ['name', 'lat', 'lon', 'capacity', 'occupancy', 'district', 'active'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  try {
    const shelter = await dbStore.updateShelter(req.params.id, updates);
    if (!shelter) return res.status(404).json({ message: 'Shelter not found' });
    res.json(shelter);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/shelters/invite
const createGovInvite = async (req, res) => {
  const { name, email, shelterId, district, shelterName } = req.body;
  if (!name || !shelterId) {
    return res.status(400).json({ message: 'Representative name and Shelter selection are required.' });
  }
  try {
    const shelters = await dbStore.findShelters();
    const shelter = shelters.find(s =>
      recordMatchesId(s, shelterId) ||
      (shelterName && String(s.name || '').trim() === String(shelterName).trim())
    );
    if (!shelter) return res.status(404).json({ message: 'Shelter not found' });

    const invite = await dbStore.createRepresentativeInvite({
      name,
      email,
      shelterId: String(shelter._id || shelter.name),
      shelterName: shelter.name,
      district: shelter.district || district || 'Multiple',
      createdBy: req.user.uid
    });
    res.status(201).json({ message: 'Invite created', inviteId: invite.inviteId });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// POST /api/shelters/logistics-invite
const createGovLogisticsInvite = async (req, res) => {
  const { name, email, assignedHub, district } = req.body;
  if (!name || !assignedHub) {
    return res.status(400).json({ message: 'Representative name and Logistics Hub selection are required.' });
  }
  try {
    const invite = await dbStore.createRepresentativeInvite({
      name,
      email,
      assignedHub,
      district: district || 'Multiple',
      createdBy: req.user.uid
    });
    res.status(201).json({ message: 'Logistics Rep Invite created', inviteId: invite.inviteId });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/shelters/invites
const listGovInvites = async (req, res) => {
  try {
    const invites = await dbStore.findRepresentativeInvites();
    // Only return invites created by this government admin
    const myInvites = invites.filter(i => i.createdBy === req.user.uid);
    res.json(myInvites);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const { sendGovInviteEmail } = require('../utils/emailService');

// POST /api/shelters/invite/send-email
const sendInviteEmail = async (req, res) => {
  const { toEmail, toName, inviteToken, shelterName, assignedHub } = req.body;
  if (!toEmail || !inviteToken) {
    return res.status(400).json({ message: 'Recipient email and invite token are required.' });
  }

  if (!process.env.GMAIL_USER || process.env.GMAIL_USER === 'your_gmail@gmail.com') {
    return res.status(503).json({
      message: 'Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file.',
      setup: 'https://myaccount.google.com/apppasswords'
    });
  }

  try {
    const registrationUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteType = (inviteToken || '').startsWith('GR-HUB-') ? 'logistics' : 'shelter';
    
    await sendGovInviteEmail({
      toEmail,
      toName: toName || 'Field Representative',
      inviteToken,
      shelterName: shelterName || '',
      assignedHub: assignedHub || '',
      adminName: req.user?.orgName || req.user?.name || 'National Disaster Admin (Govt)',
      registrationUrl,
      inviteType
    });
    
    res.json({ message: `Invite email sent successfully to ${toEmail}` });
  } catch (e) {
    console.error('Email send error:', e.message);
    res.status(500).json({
      message: `Failed to send email (${e.response || e.message || 'SMTP error'}). GMAIL_USER and GMAIL_APP_PASSWORD must match one Google account on Render flood-shield-api.`
    });
  }
};

module.exports = { getShelters, addShelter, editShelter, createGovInvite, createGovLogisticsInvite, listGovInvites, sendInviteEmail };
