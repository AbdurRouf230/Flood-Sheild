const dbStore = require('../utils/dbStore');
const { parseTakaAmount, parseTakaFromText, resolveRequestedFunding } = require('../utils/takaAmount');

// POST /api/representatives/invite  [Government]
const createInvite = async (req, res) => {
  const { name, shelterId, shelterName, district } = req.body;
  if (!name || !shelterId || !shelterName || !district) {
    return res.status(400).json({ message: 'name, shelterId, shelterName and district are required' });
  }
  try {
    const invite = await dbStore.createRepresentativeInvite({
      name,
      shelterId,
      shelterName,
      district,
      createdBy: req.user.name
    });
    res.status(201).json(invite);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/representatives/invites  [Government]
const listInvites = async (req, res) => {
  try {
    const list = await dbStore.findRepresentativeInvites();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// POST /api/representatives/requests  [GovRepresentative]
const submitRequest = async (req, res) => {
  const { requestType, itemType, quantity, fundingAmount, details, urgency, villageName, population, phone } = req.body;
  const validTypes = ['Funding', 'VillageRelief'];
  if (!validTypes.includes(requestType)) {
    return res.status(400).json({ message: 'Invalid request type. Allowed: Funding, VillageRelief' });
  }

  try {
    const base = {
      requestType,
      submittedByUid: req.user.uid,
      submittedByName: req.user.name || req.user.email || 'Gov Representative',
      representativeName: req.user.name || req.user.email || 'Gov Representative',
      shelterId: req.user.shelterId || req.user.assignedHub || '',
      shelterName: req.user.shelterName || req.user.assignedHub || 'Gov Relief Hub',
      district: req.user.district,
      itemType: itemType || '',
      quantity: parseInt(quantity) || 0,
      fundingAmount: 0,
      approvedAmount: 0,
      details: details || '',
      urgency: urgency || 'Medium',
      status: 'Pending'
    };

    if (requestType === 'Funding') {
      const amt = parseTakaAmount(fundingAmount) || parseTakaFromText(details);
      if (!amt || amt <= 0) {
        return res.status(400).json({ message: 'fundingAmount is required (e.g. 1000000 or 1000k in amount or details)' });
      }
      base.fundingAmount = amt;
      base.quantity = amt;
    }

    let reliefRequestId = '';
    if (requestType === 'VillageRelief') {
      if (!itemType || !quantity) {
        return res.status(400).json({ message: 'itemType and quantity are required for village relief requests' });
      }
      const reliefReq = await dbStore.createReliefRequest({
        villageName: villageName || req.user.shelterName || req.user.assignedHub || 'Gov Relief Hub',
        district: req.user.district,
        contactPerson: req.user.name || req.user.email || 'Gov Representative',
        phone: phone || '+8800000000000',
        population: parseInt(population) || 500,
        itemType,
        quantity: parseInt(quantity),
        priorityScore: 65,
        status: 'Pending',
        submittedByUid: req.user.uid,
        submittedByRole: 'GovRepresentative',
        destinationShelter: req.user.shelterName || req.user.assignedHub || 'Gov Relief Hub'
      });
      reliefRequestId = String(reliefReq._id?.toString?.() ?? reliefReq._id ?? '');
      base.details = base.details || `Village/shelter relief filed by ${req.user.shelterName || req.user.assignedHub || 'Gov Relief Hub'}`;
    }

    const repRequest = await dbStore.createRepresentativeRequest({
      ...base,
      reliefRequestId
    });

    res.status(201).json(repRequest);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/representatives/requests/mine  [GovRepresentative]
const myRequests = async (req, res) => {
  try {
    const list = await dbStore.findRepresentativeRequests(req.user.uid);
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/representatives/requests  [Government, NGO]
const allRequests = async (req, res) => {
  try {
    const list = await dbStore.findRepresentativeRequests();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// PUT /api/representatives/requests/:id/funding  [Government, NGO]
const respondFunding = async (req, res) => {
  const { action, amount, message } = req.body;
  if (!action || !['approve', 'decline'].includes(action.toLowerCase())) {
    return res.status(400).json({ message: 'action must be approve or decline' });
  }
  try {
    const reqDoc = await dbStore.findRepresentativeRequestById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    if (reqDoc.requestType !== 'Funding') {
      return res.status(400).json({ message: 'This endpoint is only for funding requests' });
    }
    if (reqDoc.status !== 'Pending') {
      return res.status(400).json({ message: 'Request is no longer pending' });
    }

    const responder = req.user.name || req.user.role;

    if (action.toLowerCase() === 'approve') {
      const requested = resolveRequestedFunding(reqDoc);
      const amt = parseTakaAmount(amount);
      if (!amt || !requested || amt !== requested) {
        return res.status(400).json({
          message: `Approved amount must exactly match requested amount (৳${requested.toLocaleString()})`
        });
      }
      const updated = await dbStore.updateRepresentativeRequestStatus(
        req.params.id,
        'Approved',
        `Funding approved: ৳${amt} by ${responder}`,
        { approvedAmount: amt, fundingAmount: requested }
      );
      if (!updated) return res.status(404).json({ message: 'Request not found' });
      return res.json(updated);
    }

    const declineMsg = message?.trim() || 'Funding request declined';
    const updated = await dbStore.updateRepresentativeRequestStatus(
      req.params.id,
      'Declined',
      `${declineMsg} (${responder})`
    );
    if (!updated) return res.status(404).json({ message: 'Request not found' });
    return res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// PUT /api/representatives/requests/:id  [Government, NGO]
const respondToRequest = async (req, res) => {
  const { action, govResponse } = req.body;
  const statusMap = { approve: 'Approved', reject: 'Rejected', fulfill: 'Received', receive: 'Received' };
  const status = statusMap[action?.toLowerCase?.()];
  if (!status) return res.status(400).json({ message: 'action must be approve, reject, or fulfill' });
  try {
    const updated = await dbStore.updateRepresentativeRequestStatus(req.params.id, status, govResponse || '');
    if (!updated) return res.status(404).json({ message: 'Request not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/representatives/inventory  [GovRepresentative]
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

    // Standard Shelter Representative: start with shelter baseline + add received shipments
    const merged = {
      dryFood: 800,
      waterBottles: 1500,
      medicalKits: 120,
      hygienePacks: 250,
      shelterKits: 80
    };

    const repInv = await dbStore.findRepresentativeInventory(req.user.uid);
    if (Array.isArray(repInv)) {
      repInv.forEach(row => {
        if (row.itemType === 'Food') merged.dryFood += (row.quantity || 0);
        else if (row.itemType === 'Water') merged.waterBottles += (row.quantity || 0);
        else if (row.itemType === 'Medicine') merged.medicalKits += (row.quantity || 0);
        else if (row.itemType === 'Shelter Kits') merged.shelterKits += (row.quantity || 0);
      });
    }

    res.json(merged);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/representatives/transports  [GovRepresentative / GovRepLogistics / NGORepresentative]
const myTransports = async (req, res) => {
  try {
    const all = await dbStore.findTransports();
    const shelter = (req.user?.shelterName || '').toLowerCase().trim();
    const hub = (req.user?.assignedHub || req.user?.campaignName || '').toLowerCase().trim();
    const district = (req.user?.district || '').toLowerCase().trim();

    const filtered = all.filter(t => {
      if (t.representativeUid && t.representativeUid === req.user?.uid) return true;
      if (t.addedBy && (t.addedBy === req.user?.name || t.addedBy === req.user?.email)) return true;

      const origin = (t.origin || '').toLowerCase();
      const destination = (t.destination || '').toLowerCase();
      const assigned = (t.assignedHub || '').toLowerCase();
      const tDist = (t.district || '').toLowerCase();

      // Match shelter destination
      if (shelter && destination.includes(shelter)) return true;

      // Match logistics hub origin, destination, or assigned hub
      if (hub && (origin.includes(hub) || destination.includes(hub) || assigned.includes(hub) || hub.includes(origin) || hub.includes(destination))) return true;

      // Match district if set
      if (district && (tDist.includes(district) || origin.includes(district) || destination.includes(district))) return true;

      return false;
    });
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = {
  createInvite,
  listInvites,
  submitRequest,
  myRequests,
  allRequests,
  respondToRequest,
  respondFunding,
  getInventory,
  myTransports
};
