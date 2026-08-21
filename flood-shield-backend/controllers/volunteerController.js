const dbStore = require('../utils/dbStore');

// GET /api/volunteers/slots
const getSlots = async (req, res) => {
  try {
    const slots = await dbStore.findVolunteerSlots();
    res.json(slots);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/volunteers/slots  [NGO, Government]
const createSlot = async (req, res) => {
  const { district, taskType, volunteersNeeded, description } = req.body;
  if (!district || !taskType || !volunteersNeeded) {
    return res.status(400).json({ message: 'district, taskType and volunteersNeeded are required' });
  }
  try {
    const slot = await dbStore.createVolunteerSlot({
      postedBy: req.user.name,
      postedByRole: req.user.role,
      district, taskType,
      volunteersNeeded: parseInt(volunteersNeeded),
      description: description || ''
    });
    res.status(201).json(slot);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/volunteers/slots/:id/apply  [Volunteer]
const applyToSlot = async (req, res) => {
  const { id } = req.params;
  const { message, cvUrl, nidNumber, nidImageUrl } = req.body;
  try {
    // Check for duplicate application
    const existing = await dbStore.findVolunteerApplications({ slotId: id, volunteerUid: req.user.uid });
    if (existing.length > 0) {
      return res.status(400).json({ message: 'You have already applied to this slot.' });
    }
    const app = await dbStore.createVolunteerApplication({
      slotId: id,
      volunteerUid: req.user.uid,
      volunteerName: req.user.name,
      volunteerDistrict: req.user.district,
      message: message || '',
      cvUrl: cvUrl || '',
      nidNumber: nidNumber || '',
      nidImageUrl: nidImageUrl || ''
    });
    res.status(201).json(app);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// PUT /api/volunteers/slots/:slotId/applications/:appId/respond  [NGO, Government]
const respondToApplication = async (req, res) => {
  const { slotId, appId } = req.params;
  const { action } = req.body; // 'accept' or 'reject'
  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'action must be accept or reject' });
  }
  try {
    const status = action === 'accept' ? 'Accepted' : 'Rejected';
    const app = await dbStore.updateApplicationStatus(appId, status, req.user.name);
    if (!app) return res.status(404).json({ message: 'Application not found' });

    // If accepted, add volunteer to slot assignedVolunteers and upgrade Citizen to Volunteer
    if (status === 'Accepted') {
      await dbStore.assignVolunteerToSlot(slotId, {
        volunteerUid: app.volunteerUid,
        volunteerName: app.volunteerName
      });
      const applicantUser = await dbStore.findUserByUid(app.volunteerUid);
      if (applicantUser && applicantUser.role === 'Citizen') {
        await dbStore.updateUserRole(app.volunteerUid, 'Volunteer');
        console.log(`Role upgraded: User ${app.volunteerUid} (${app.volunteerName}) changed from Citizen to Volunteer`);
      }
    }
    res.json(app);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/volunteers/applications/mine  [Volunteer]
const getMyApplications = async (req, res) => {
  try {
    const apps = await dbStore.findVolunteerApplications({ volunteerUid: req.user.uid });
    res.json(apps);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/volunteers/applications/slot/:slotId  [NGO, Government]
const getSlotApplications = async (req, res) => {
  try {
    const apps = await dbStore.findVolunteerApplications({ slotId: req.params.slotId });
    res.json(apps);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/volunteers/map  — volunteer density by district (derived from User collection)
const getVolunteerMap = async (req, res) => {
  try {
    // Count approved incidents per district to compute need score
    const incidents = await dbStore.findIncidents();
    const approvedByDistrict = {};
    incidents.filter(i => i.status === 'Approved').forEach(i => {
      approvedByDistrict[i.district] = (approvedByDistrict[i.district] || 0) + 1;
    });

    // Count volunteer slots open per district
    const slots = await dbStore.findVolunteerSlots();
    const neededByDistrict = {};
    slots.filter(s => s.status === 'Open').forEach(s => {
      neededByDistrict[s.district] = (neededByDistrict[s.district] || 0) + s.volunteersNeeded;
    });

    const districts = [
      'Sylhet', 'Sunamganj', 'Kurigram', 'Gaibandha', 'Netrokona', 'Sirajganj',
      'Jamalpur', 'Bogura', 'Dhaka', 'Chittagong', 'Feni', 'Comilla', 'Khulna',
      'Barishal', 'Lalmonirhat', 'Rangpur', 'Cox\'s Bazar', 'Mymensingh', 'Patuakhali',
      'Noakhali', 'Rajshahi', 'Tangail', 'Satkhira', 'Habiganj'
    ];
    const map = districts.map(d => ({
      district: d,
      approvedIncidents: approvedByDistrict[d] || 0,
      volunteersNeeded: neededByDistrict[d] || 0,
      needScore: (approvedByDistrict[d] || 0) + (neededByDistrict[d] || 0)
    })).sort((a, b) => b.needScore - a.needScore);

    res.json(map);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// PUT /api/volunteers/slots/:id/close  [NGO, Government]
const closeSlot = async (req, res) => {
  try {
    const slot = await dbStore.updateVolunteerSlotStatus(req.params.id, 'Closed');
    res.json(slot);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/volunteers/available  [NGO, Government, NGORepresentative, GovRepresentative]
const getAvailableVolunteers = async (req, res) => {
  try {
    const { district, excludeUids } = req.query;
    const excluded = excludeUids ? excludeUids.split(',').map(s => s.trim()).filter(Boolean) : [];
    let volunteers = await dbStore.findVolunteers(district || null, excluded);

    const userRole = req.user?.role || '';
    let filtered = [...volunteers];
    if (userRole === 'NGO' || userRole === 'NGORepresentative') {
      filtered = volunteers.filter(v => v.name?.includes('[BRAC]') || v.orgName?.toLowerCase().includes('ngo') || v.orgName?.toLowerCase().includes('brac') || (!v.name?.includes('[GOV]') && !v.orgName?.toLowerCase().includes('government')));
    } else if (userRole.includes('Gov') || userRole.includes('Government')) {
      filtered = volunteers.filter(v => v.name?.includes('[GOV]') || v.orgName?.toLowerCase().includes('government') || v.orgName?.toLowerCase().includes('dmro'));
    }

    if (filtered.length > 0) {
      return res.json(filtered);
    }
    // Fallback: return all volunteers in district so list is never empty
    res.json(volunteers);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// PUT /api/volunteers/:uid/task  [NGO, Government, NGORepresentative, GovRepresentative]
const assignTask = async (req, res) => {
  try {
    const { uid } = req.params;
    const { task } = req.body;
    const result = await dbStore.assignTaskToVolunteer(uid, task);
    res.json({ message: `Assigned task ${task} to volunteer ${uid}`, ...result });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

module.exports = { getSlots, createSlot, applyToSlot, respondToApplication, getMyApplications, getSlotApplications, getVolunteerMap, closeSlot, getAvailableVolunteers, assignTask };
