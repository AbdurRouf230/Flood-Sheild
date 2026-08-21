const dbStore = require('../utils/dbStore');
const { sendNGOInviteEmail } = require('../utils/emailService');

/**
 * GET /api/campaigns
 * List active campaigns (or all campaigns for requesting NGO)
 */
const getCampaigns = async (req, res) => {
  try {
    if (req.user && req.user.role === 'NGO') {
      const all = await dbStore.findCampaigns({});
      const campaigns = all.filter((c) =>
        c.ngoId === req.user.uid ||
        (req.user.orgName && c.ngoName === req.user.orgName)
      );
      return res.json(campaigns);
    }
    const campaigns = await dbStore.findCampaigns({ status: 'Active' });
    res.json(campaigns);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * POST /api/campaigns
 * NGO creates a new flood relief campaign
 */
const createCampaign = async (req, res) => {
  const { name, district, lat, lon, capacity, contactPhone } = req.body;
  if (!name || !district || !lat || !lon) {
    return res.status(400).json({ message: 'Name, district, latitude, and longitude are required.' });
  }
  try {
    const campaignId = 'CMP-' + (district ? district.substring(0, 3).toUpperCase() : 'BD') + '-' + Math.floor(100000 + Math.random() * 900000);
    const campaign = await dbStore.createCampaign({
      campaignId,
      name,
      ngoId: req.user.uid,
      ngoName: req.user.orgName || req.user.name,
      district,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      capacity: capacity ? parseInt(capacity) : 500,
      occupancy: 0,
      contactPhone: contactPhone || '',
      status: 'Active'
    });
    res.status(201).json(campaign);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * PUT /api/campaigns/:id
 * NGO updates campaign status, capacity, or occupancy
 */
const updateCampaign = async (req, res) => {
  const { id } = req.params;
  try {
    const campaign = await dbStore.updateCampaign(id, req.body);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * POST /api/campaigns/invite
 * NGO creates invite token for an NGORepresentative
 */
const createInvite = async (req, res) => {
  const { name, email, campaignId } = req.body;
  if (!name || !campaignId) {
    return res.status(400).json({ message: 'Representative name and Campaign selection are required.' });
  }
  try {
    const campaign = await dbStore.findCampaignByCampaignId(campaignId);
    if (!campaign) return res.status(404).json({ message: 'Selected Campaign not found.' });

    const inviteId = 'NR-' + campaign.district.substring(0, 3).toUpperCase() + '-' + Math.floor(100000 + Math.random() * 900000);
    const invite = await dbStore.createNGOInvite({
      inviteId,
      ngoId: req.user.uid,
      ngoName: req.user.orgName || req.user.name,
      name,
      email: email ? email.trim() : '',
      campaignId: campaign.campaignId,
      campaignName: campaign.name,
      assignedHub: '',
      district: campaign.district
    });
    res.status(201).json({ message: 'Invite created', inviteId: invite.inviteId });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * POST /api/campaigns/logistics-invite
 * NGO creates invite token for an NGORepresentative assigned to a Logistics Hub
 */
const createLogisticsInvite = async (req, res) => {
  const { name, email, assignedHub } = req.body;
  if (!name || !assignedHub) {
    return res.status(400).json({ message: 'Representative name and Logistics Hub selection are required.' });
  }
  try {
    const inviteId = 'NR-HUB-' + Math.floor(100000 + Math.random() * 900000);
    const invite = await dbStore.createNGOInvite({
      inviteId,
      ngoId: req.user.uid,
      ngoName: req.user.orgName || req.user.name,
      name,
      email: email ? email.trim() : '',
      campaignId: '',
      campaignName: '',
      assignedHub,
      district: 'Multiple'
    });

    res.status(201).json({ message: 'Logistics Rep Invite created', inviteId: invite.inviteId });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * GET /api/campaigns/invites
 * NGO lists generated invite tokens
 */
const listInvites = async (req, res) => {
  try {
    const invites = await dbStore.findNGOInvites(req.user.uid);
    res.json(invites);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * POST /api/campaigns/requests
 * NGORepresentative submits request to parent NGO
 */
const submitRequest = async (req, res) => {
  const { itemsNeeded, urgency } = req.body;
  if (!itemsNeeded) {
    return res.status(400).json({ message: 'itemsNeeded is required' });
  }
  try {
    const newReq = await dbStore.createCampaignRequest({
      campaignId: req.user.campaignId || req.user.assignedHub || '',
      campaignName: req.user.campaignName || req.user.assignedHub || 'NGO Relief Hub',
      district: req.user.district,
      ngoId: req.user.ngoId,
      representativeId: req.user.uid,
      representativeName: req.user.name || req.user.email || 'NGO Representative',
      itemsNeeded,
      urgency: urgency || 'Medium'
    });
    res.status(201).json(newReq);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * GET /api/campaigns/requests/mine
 * NGORepresentative views their submitted requests
 */
const myRequests = async (req, res) => {
  try {
    const reqs = await dbStore.findCampaignRequests({ representativeId: req.user.uid });
    res.json(reqs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * GET /api/campaigns/requests
 * NGO views requests for their campaigns
 */
const allRequests = async (req, res) => {
  try {
    const reqs = await dbStore.findCampaignRequests({ ngoId: req.user.uid });
    res.json(reqs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * PUT /api/campaigns/requests/:id
 * NGO responds to campaign request (approve/fund/reject)
 */
const respondToRequest = async (req, res) => {
  const { id } = req.params;
  const { status, fundingAmount, responseNote } = req.body;
  try {
    const updated = await dbStore.updateCampaignRequestStatus(id, {
      status,
      fundingAmount: fundingAmount ? parseFloat(fundingAmount) : 0,
      responseNote: responseNote || ''
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * GET /api/campaigns/inventory
 * NGORepresentative views campaign inventory (merges static campaign stock + received shipments)
 */
const getInventory = async (req, res) => {
  try {
    if (req.user.assignedHub) {
      // Logistics Hub Representative: pull directly from main logistics warehouse inventory
      const allInventory = await dbStore.findInventory();
      const hubInventoryRows = allInventory.filter(row => 
        (row.warehouseName || '').toLowerCase().includes(req.user.assignedHub.toLowerCase()) ||
        req.user.assignedHub.toLowerCase().includes((row.warehouseName || '').toLowerCase())
      );
      
      const merged = {
        dryFood: 0,
        waterBottles: 0,
        medicalKits: 0,
        hygienePacks: 0,
        shelterKits: 0
      };
      
      hubInventoryRows.forEach(row => {
        if (row.itemType === 'Food') merged.dryFood += (row.quantity || 0);
        else if (row.itemType === 'Water') merged.waterBottles += (row.quantity || 0);
        else if (row.itemType === 'Medicine') merged.medicalKits += (row.quantity || 0);
        else if (row.itemType === 'Shelter Kits') merged.shelterKits += (row.quantity || 0);
      });
      return res.json(merged);
    }

    // Standard Campaign Representative: pull from campaign + received transports
    const campaign = await dbStore.findCampaignByCampaignId(req.user.campaignId);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    // Start from the campaign's static inventory object
    const base = campaign.inventory || {};
    const merged = {
      dryFood: base.dryFood || 0,
      waterBottles: base.waterBottles || 0,
      medicalKits: base.medicalKits || 0,
      hygienePacks: base.hygienePacks || 0,
      shelterKits: base.shelterKits || 0
    };

    // Layer in any items received by this rep via Receive Shipment
    const repInv = await dbStore.findRepresentativeInventory(req.user.uid);
    repInv.forEach(row => {
      if (row.itemType === 'Food') merged.dryFood += (row.quantity || 0);
      else if (row.itemType === 'Water') merged.waterBottles += (row.quantity || 0);
      else if (row.itemType === 'Medicine') merged.medicalKits += (row.quantity || 0);
      else if (row.itemType === 'Shelter Kits') merged.shelterKits += (row.quantity || 0);
    });

    res.json(merged);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * POST /api/campaigns/invite/send-email
 * NGO sends the generated invite token to the representative via email
 */
const sendInviteEmail = async (req, res) => {
  const { toEmail, toName, inviteToken, campaignName, assignedHub } = req.body;
  if (!toEmail || !inviteToken) {
    return res.status(400).json({ message: 'Recipient email and invite token are required.' });
  }

  if (!process.env.GMAIL_USER || process.env.GMAIL_USER === 'your_gmail@gmail.com') {
    return res.status(503).json({
      message: 'Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file.',
      setup: 'https://myaccount.google.com/apppasswords'
    });
  }
  if (!(process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')) {
    return res.status(503).json({
      message: 'GMAIL_APP_PASSWORD is missing on Render (flood-shield-api). Add the 16-character Google App Password there, not on Vercel.'
    });
  }

  try {
    const registrationUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteType = (inviteToken || '').startsWith('NR-HUB-') ? 'logistics' : 'campaign';
    await sendNGOInviteEmail({
      toEmail,
      toName: toName || 'Field Representative',
      inviteToken,
      campaignName: campaignName || 'Assigned Campaign',
      assignedHub: assignedHub || '',
      ngoName: req.user?.orgName || req.user?.name || 'Flood Shield NGO',
      registrationUrl,
      inviteType
    });
    res.json({ message: `Invite email sent successfully to ${toEmail}` });
  } catch (e) {
    console.error('Email send error:', e.message);
    const smtp = e.response || e.message || 'unknown SMTP error';
    res.status(500).json({
      message: `Failed to send email (${smtp}). GMAIL_USER must be the same Google account that created the App Password. Set both on Render flood-shield-api, then Save and wait for Live.`
    });
  }
};

module.exports = {
  getCampaigns,
  createCampaign,
  updateCampaign,
  createInvite,
  createLogisticsInvite,
  listInvites,
  submitRequest,
  myRequests,
  allRequests,
  respondToRequest,
  getInventory,
  sendInviteEmail
};
