const dbStore = require('../utils/dbStore');

// POST /api/donations
const submitDonation = async (req, res) => {
  const { donorName, amount, message, district } = req.body;
  if (!donorName || !amount || isNaN(amount) || Number(amount) < 1) {
    return res.status(400).json({ message: 'donorName and a valid amount (min 1 BDT) are required' });
  }
  try {
    const donation = await dbStore.createDonation({
      donorName,
      donorUid: req.user ? req.user.uid : 'anonymous',
      amount: Number(amount),
      message: message || '',
      district: district || 'General'
    });
    res.status(201).json(donation);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/donations  [Government]
const getAllDonations = async (req, res) => {
  try {
    const donations = await dbStore.findDonations();
    res.json(donations);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/donations/total  [Government]
const getDonationTotal = async (req, res) => {
  try {
    const total = await dbStore.getTotalDonations();
    res.json(total);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/donations/public  — no auth — public leaderboard (top 20 by amount)
const getPublicLeaderboard = async (req, res) => {
  try {
    const all = await dbStore.findDonations();
    const leaderboard = all
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20)
      .map(d => ({ donorName: d.donorName, amount: d.amount, district: d.district, message: d.message, donatedAt: d.donatedAt }));
    res.json(leaderboard);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/donations/disburse  [Government Admin / Rep]
const disburseNGOFunding = async (req, res) => {
  const { ngoName, ngoId, amount, district, notes } = req.body;
  if (!ngoName || !amount || isNaN(amount) || Number(amount) < 1) {
    return res.status(400).json({ message: 'ngoName and a valid funding grant amount (min 1 BDT) are required' });
  }
  try {
    const totalRaisedObj = await dbStore.getTotalDonations();
    const totalDisbursedObj = await dbStore.getTotalDisbursed();
    const govAvailableTreasury = (totalRaisedObj.total || 0) + 5000000000 - (totalDisbursedObj.total || 0);

    if (Number(amount) > govAvailableTreasury) {
      return res.status(400).json({ message: `Insufficient Government Treasury funds. Current available balance is ৳${govAvailableTreasury.toLocaleString()} BDT.` });
    }

    const disb = await dbStore.createDisbursement({
      ngoName,
      ngoId: ngoId || '',
      amount: Number(amount),
      district: district || 'General',
      notes: notes || '',
      disbursedBy: req.user?.name || req.user?.email || 'National Disaster Admin (Govt)',
      status: 'Disbursed',
      disbursedAt: new Date()
    });
    res.status(201).json({ message: `Successfully disbursed ৳${Number(amount).toLocaleString()} grant to ${ngoName}!`, disbursement: disb });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/donations/disbursements
const getDisbursements = async (req, res) => {
  try {
    const disbursements = await dbStore.findDisbursements();
    const totalDisbursedObj = await dbStore.getTotalDisbursed();
    res.json({ disbursements, totalDisbursed: totalDisbursedObj.total });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/donations/ngo-treasury  [NGO Admin & Representatives]
const getNGOTreasury = async (req, res) => {
  try {
    const ngoName = req.user?.orgName || req.user?.ngoName || 'BRAC Disaster Relief Partner';
    const allDisbursements = await dbStore.findDisbursements();
    const ngoGrants = allDisbursements.filter(d =>
      d.ngoName.toLowerCase().includes(ngoName.toLowerCase()) ||
      ngoName.toLowerCase().includes(d.ngoName.toLowerCase())
    );

    const internalBudget = 500000; // Baseline internal NGO budget ৳500,000
    const allocations = await dbStore.findNGOAllocations(ngoName);

    const totalGranted = ngoGrants.reduce((s, g) => s + (g.amount || 0), 0);
    const totalAllocated = allocations.reduce((s, a) => s + (a.amount || 0), 0);
    const availableBudget = internalBudget + totalGranted - totalAllocated;

    res.json({
      ngoName,
      internalBudget,
      totalGranted,
      totalAllocated,
      availableBudget,
      ngoGrants,
      allocations
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/donations/ngo-allocate  [NGO Admin / Rep]
const allocateNGOFunding = async (req, res) => {
  const { targetType, targetId, targetName, amount, notes } = req.body;
  if (!targetType || !targetName || !amount || isNaN(amount) || Number(amount) < 1) {
    return res.status(400).json({ message: 'targetType (Campaign/Logistics), targetName, and a valid amount are required' });
  }
  try {
    const ngoName = req.user?.orgName || req.user?.ngoName || 'BRAC Disaster Relief Partner';
    const allDisbursements = await dbStore.findDisbursements();
    const ngoGrants = allDisbursements.filter(d =>
      d.ngoName.toLowerCase().includes(ngoName.toLowerCase()) ||
      ngoName.toLowerCase().includes(d.ngoName.toLowerCase())
    );

    const internalBudget = 500000; // Baseline internal NGO budget ৳500,000
    const allocations = await dbStore.findNGOAllocations(ngoName);

    const totalGranted = ngoGrants.reduce((s, g) => s + (g.amount || 0), 0);
    const totalAllocated = allocations.reduce((s, a) => s + (a.amount || 0), 0);
    const availableBudget = internalBudget + totalGranted - totalAllocated;

    if (Number(amount) > availableBudget) {
      return res.status(400).json({ message: `Insufficient NGO Treasury funds. Current available unallocated balance is ৳${availableBudget.toLocaleString()} BDT.` });
    }

    const alloc = await dbStore.createNGOAllocation({
      ngoId: req.user?.ngoId || req.user?.uid || 'ngo-1',
      ngoName,
      targetType,
      targetId: targetId || '',
      targetName,
      amount: Number(amount),
      notes: notes || '',
      allocatedBy: req.user?.name || req.user?.email || 'NGO Representative',
      allocatedAt: new Date()
    });

    res.status(201).json({
      message: `Successfully allocated ৳${Number(amount).toLocaleString()} to ${targetType}: ${targetName}!`,
      allocation: alloc
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const GOV_REP_ROLES = ['GovRepresentative', 'GovRepLogistics'];
const NGO_REP_ROLES = ['NGORepresentative', 'NGORepLogistics'];

const siteFromUser = (user) => {
  if (user?.campaignName) return { siteName: user.campaignName, siteType: 'Campaign' };
  if (user?.shelterName) return { siteName: user.shelterName, siteType: 'Shelter' };
  if (user?.assignedHub) return { siteName: user.assignedHub, siteType: 'Logistics' };
  return { siteName: user?.orgName || user?.name || 'Field site', siteType: 'Logistics' };
};

// POST /api/donations/funding-requests  [NGO/GOV representatives]
const submitFundingRequest = async (req, res) => {
  const role = req.user?.role || '';
  const isGovRep = GOV_REP_ROLES.includes(role);
  const isNgoRep = NGO_REP_ROLES.includes(role);
  if (!isGovRep && !isNgoRep) {
    return res.status(403).json({ message: 'Only field representatives can request funding from their admin.' });
  }

  const { amount, purpose, district } = req.body;
  if (!amount || isNaN(amount) || Number(amount) < 1) {
    return res.status(400).json({ message: 'A valid funding amount (min 1 BDT) is required.' });
  }

  try {
    const site = siteFromUser(req.user);
    const created = await dbStore.createFundingRequest({
      requestedByUid: req.user.uid,
      requestedByName: req.user.name || req.user.email || 'Representative',
      requestedByRole: role,
      targetAdmin: isGovRep ? 'Government' : 'NGO',
      amount: Number(amount),
      district: district || req.user.district || 'General',
      purpose: purpose || '',
      siteName: site.siteName,
      siteType: site.siteType,
      orgName: req.user.orgName || req.user.ngoName || '',
      ngoId: req.user.ngoId || '',
      status: 'Pending'
    });
    res.status(201).json({
      message: `Funding request of ৳${Number(amount).toLocaleString()} sent to ${isGovRep ? 'Government' : 'NGO'} admin.`,
      request: created
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/donations/funding-requests
const getFundingRequests = async (req, res) => {
  try {
    const role = req.user?.role || '';
    let filter = {};
    if (role === 'Government') {
      filter = { targetAdmin: 'Government' };
    } else if (role === 'NGO') {
      filter = { targetAdmin: 'NGO', orgName: req.user.orgName || req.user.ngoName || '' };
    } else if (GOV_REP_ROLES.includes(role) || NGO_REP_ROLES.includes(role)) {
      filter = { requestedByUid: req.user.uid };
    } else {
      return res.status(403).json({ message: 'Not authorized to view funding requests.' });
    }

    let requests = await dbStore.findFundingRequests(filter);
    if (role === 'NGO' && (!req.user.orgName && !req.user.ngoName)) {
      requests = (await dbStore.findFundingRequests({ targetAdmin: 'NGO' }))
        .filter((r) => r.requestedByUid);
    }
    res.json(requests);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/donations/funding-requests/:id/fulfill  [Government or NGO admin]
const fulfillFundingRequest = async (req, res) => {
  try {
    const role = req.user?.role || '';
    const request = await dbStore.findFundingRequestById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Funding request not found.' });
    if (request.status !== 'Pending') {
      return res.status(400).json({ message: `This request is already ${request.status}.` });
    }

    if (role === 'Government') {
      if (request.targetAdmin !== 'Government') {
        return res.status(403).json({ message: 'This request was sent to the NGO admin, not Government admin.' });
      }

      const totalRaisedObj = await dbStore.getTotalDonations();
      const totalDisbursedObj = await dbStore.getTotalDisbursed();
      const govAvailableTreasury = (totalRaisedObj.total || 0) + 5000000000 - (totalDisbursedObj.total || 0);
      if (Number(request.amount) > govAvailableTreasury) {
        return res.status(400).json({ message: `Insufficient Government Treasury funds. Available: ৳${govAvailableTreasury.toLocaleString()} BDT.` });
      }

      await dbStore.createDisbursement({
        ngoName: request.siteName || request.requestedByName,
        ngoId: request.ngoId || '',
        amount: Number(request.amount),
        district: request.district || 'General',
        notes: `Field request from ${request.requestedByName} (${request.siteType}). ${request.purpose || ''}`.trim(),
        disbursedBy: req.user?.name || 'Government Admin',
        status: 'Disbursed',
        disbursedAt: new Date()
      });
    } else if (role === 'NGO') {
      if (request.targetAdmin !== 'NGO') {
        return res.status(403).json({ message: 'This request was sent to the Government admin, not NGO admin.' });
      }

      const ngoName = req.user?.orgName || req.user?.ngoName || 'BRAC Disaster Relief Partner';
      const allDisbursements = await dbStore.findDisbursements();
      const ngoGrants = allDisbursements.filter(d =>
        d.ngoName.toLowerCase().includes(ngoName.toLowerCase()) ||
        ngoName.toLowerCase().includes(d.ngoName.toLowerCase())
      );
      const internalBudget = 500000;
      const allocations = await dbStore.findNGOAllocations(ngoName);
      const totalGranted = ngoGrants.reduce((s, g) => s + (g.amount || 0), 0);
      const totalAllocated = allocations.reduce((s, a) => s + (a.amount || 0), 0);
      const availableBudget = internalBudget + totalGranted - totalAllocated;
      if (Number(request.amount) > availableBudget) {
        return res.status(400).json({ message: `Insufficient NGO Treasury funds. Available: ৳${availableBudget.toLocaleString()} BDT.` });
      }

      const targetType = request.siteType === 'Campaign' ? 'Campaign' : 'Logistics';
      await dbStore.createNGOAllocation({
        ngoId: req.user?.ngoId || req.user?.uid || request.ngoId || '',
        ngoName,
        targetType,
        targetId: '',
        targetName: request.siteName || request.requestedByName,
        amount: Number(request.amount),
        notes: `Field request from ${request.requestedByName}. ${request.purpose || ''}`.trim(),
        allocatedBy: req.user?.name || 'NGO Admin',
        allocatedAt: new Date()
      });
    } else {
      return res.status(403).json({ message: 'Only Government or NGO admin can disburse a funding request.' });
    }

    const updated = await dbStore.updateFundingRequest(req.params.id, {
      status: 'Disbursed',
      disbursedBy: req.user?.name || req.user?.email || 'Admin',
      disbursedAt: new Date()
    });

    res.json({
      message: `Disbursed ৳${Number(request.amount).toLocaleString()} for ${request.requestedByName}'s request.`,
      request: updated
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

module.exports = {
  submitDonation,
  getAllDonations,
  getDonationTotal,
  getPublicLeaderboard,
  disburseNGOFunding,
  getDisbursements,
  getNGOTreasury,
  allocateNGOFunding,
  submitFundingRequest,
  getFundingRequests,
  fulfillFundingRequest
};


