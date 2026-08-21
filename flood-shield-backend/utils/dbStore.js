const User = require('../models/User');
const Incident = require('../models/Incident');
const Inventory = require('../models/Inventory');
const ReliefRequest = require('../models/ReliefRequest');
const ReliefAllocation = require('../models/ReliefAllocation');
const ChatMessage = require('../models/ChatMessage');
const VolunteerSlot = require('../models/VolunteerSlot');
const VolunteerApplication = require('../models/VolunteerApplication');
const Donation = require('../models/Donation');
const Disbursement = require('../models/Disbursement');
const NGORequest = require('../models/NGORequest');
const Shelter = require('../models/Shelter');
const Transport = require('../models/Transport');
const RepresentativeInvite = require('../models/RepresentativeInvite');
const RepresentativeRequest = require('../models/RepresentativeRequest');
const RepresentativeInventory = require('../models/RepresentativeInventory');
const Campaign = require('../models/Campaign');
const NGOInvite = require('../models/NGOInvite');
const CampaignRequest = require('../models/CampaignRequest');
const NGOAllocation = require('../models/NGOAllocation');
const FundingRequest = require('../models/FundingRequest');
const SOSAlert = require('../models/SOSAlert');
const { getIsConnected } = require('../config/db');
const {
  SEED_VOLUNTEER_SLOTS,
  SEED_VOLUNTEER_APPLICATIONS,
  SEED_SHELTERS,
  SEED_CAMPAIGNS
} = require('./seedData');

// In-memory fallback database for when MongoDB is not running locally
const inMemoryUsers = [];
const inMemoryRepresentativeInvites = [];
const inMemoryRepresentativeRequests = [];
const inMemoryRepresentativeInventory = [];
const inMemoryCampaigns = [];
const inMemoryNGOInvites = [];
const inMemoryCampaignRequests = [];
const inMemorySOSAlerts = [
  {
    _id: 'sos-101',
    citizenUid: 'test-citizen-01',
    citizenName: 'Rahim Citizen (Test)',
    citizenPhone: '+8801711223344',
    citizenEmail: 'citizen.test@floodshield.bd',
    district: 'Sylhet',
    villageName: 'Gowainghat River Bank',
    latitude: 24.9020,
    longitude: 91.8820,
    message: '🔴 Emergency SOS: Water level rose 4ft in 30 mins! Family of 5 stranded on upper roof. Need immediate rescue boat!',
    urgency: 'Critical',
    status: 'Volunteer Dispatched',
    assignedVolunteerUid: 'test-volunteer-01',
    assignedVolunteerName: 'Fatema Volunteer (Test)',
    assignedVolunteerPhone: '+8801811998877',
    volunteerLatitude: 24.8960,
    volunteerLongitude: 91.8740,
    // NEW: multiple dispatches array — demo shows 2 units responding
    dispatches: [
      {
        _id: 'disp-101-single',
        dispatchType: 'Single',
        volunteerUid: 'test-volunteer-01',
        volunteerName: 'Fatema Volunteer (Test)',
        volunteerPhone: '+8801811998877',
        groupName: '',
        logoUrl: '',
        teamMembers: [],
        latitude: 24.8960,
        longitude: 91.8740,
        dispatchedBy: 'Tariq Gov Field Officer (Sylhet Shelter)',
        dispatchedByUid: 'seed-gov-rep-tariq',
        dispatchedByRole: 'GovRepresentative',
        dispatchedAt: new Date(Date.now() - 1200000)
      },
      {
        _id: 'disp-101-group',
        dispatchType: 'Group',
        volunteerUid: 'test-vol-leader-01',
        volunteerName: 'Hassan Field Officer (Sunamganj Shelter)',
        volunteerPhone: '+8801815190087',
        groupName: 'Sylhet River Rescue Squad',
        logoUrl: '',   // No logo in seed — will show 🏥 icon
        teamMembers: [
          { uid: 'test-vol-leader-01', name: 'Hassan Field Officer', role: 'GovRepresentative', phone: '+8801815190087' },
          { uid: 'mem-02', name: 'Kamal Rescuer', role: 'Volunteer', phone: '+8801700000001' },
          { uid: 'mem-03', name: 'Rina Helper', role: 'Volunteer', phone: '+8801700000002' }
        ],
        latitude: 24.9120,   // Shelter location (slightly north of citizen)
        longitude: 91.8680,
        dispatchedBy: 'Hassan Field Officer (Sunamganj Shelter)',
        dispatchedByUid: 'test-vol-leader-01',
        dispatchedByRole: 'GovRepresentative',
        dispatchedAt: new Date(Date.now() - 900000)
      }
    ],
    messages: [
      { senderUid: 'test-citizen-01', senderName: 'Rahim Citizen', senderRole: 'Citizen', text: 'SOS! We are stranded at Gowainghat near the school building!', timestamp: new Date(Date.now() - 1800000) },
      { senderUid: 'test-volunteer-01', senderName: 'Fatema Volunteer', senderRole: 'Volunteer', text: 'Fatema here with Sylhet Rescue Team 1! We received your SOS and are deploying an inflatable boat now. Stay on high ground!', timestamp: new Date(Date.now() - 1200000) },
      { senderUid: 'test-citizen-01', senderName: 'Rahim Citizen', senderRole: 'Citizen', text: 'Thank you sister Fatema! We see your boat direction on the map radar.', timestamp: new Date(Date.now() - 600000) }
    ],
    createdAt: new Date(Date.now() - 2400000),
    updatedAt: new Date(Date.now() - 600000)
  },
  {
    _id: 'sos-102',
    citizenUid: 'seed-cit-02',
    citizenName: 'Abdul Karim',
    citizenPhone: '+8801912345678',
    citizenEmail: 'karim@test.bd',
    district: 'Sunamganj',
    villageName: 'Tanguar Haor Edge',
    latitude: 25.0715,
    longitude: 91.3992,
    message: '🚨 Emergency SOS: Elderly patient needs medical evacuation and oxygen kit.',
    urgency: 'High',
    status: 'Active SOS',
    assignedVolunteerUid: '',
    assignedVolunteerName: '',
    assignedVolunteerPhone: '',
    volunteerLatitude: null,
    volunteerLongitude: null,
    dispatches: [],
    messages: [
      { senderUid: 'seed-cit-02', senderName: 'Abdul Karim', senderRole: 'Citizen', text: 'Elderly father has breathing difficulty in flooded house. Requesting rescue team!', timestamp: new Date(Date.now() - 900000) }
    ],
    createdAt: new Date(Date.now() - 900000),
    updatedAt: new Date(Date.now() - 900000)
  }
];

const inMemoryNGOAllocations = [
  {
    _id: 'alloc-201',
    ngoId: 'test-ngo-01',
    ngoName: 'BRAC Disaster Relief Partner',
    targetType: 'Campaign',
    targetId: 'cmp-syl-01',
    targetName: 'Sylhet Haor Relief Camp',
    amount: 50000,
    notes: 'Emergency medical aid and dry food funding',
    allocatedBy: 'Ayesha Rahman (NGO Admin)',
    allocatedAt: new Date(Date.now() - 86400000 * 3)
  },
  {
    _id: 'alloc-202',
    ngoId: 'test-ngo-01',
    ngoName: 'BRAC Disaster Relief Partner',
    targetType: 'Logistics',
    targetId: 'log-syl-01',
    targetName: 'Sylhet Disaster Logistics Hub',
    amount: 30000,
    notes: 'Inventory procurement for water purification kits',
    allocatedBy: 'Ayesha Rahman (NGO Admin)',
    allocatedAt: new Date(Date.now() - 86400000 * 1)
  }
];
const inMemoryFundingRequests = [];
const inMemoryDisbursements = [
  {
    _id: 'disb-101',
    ngoName: 'Care Flood Response',
    ngoId: 'ngo-1',
    amount: 150000,
    district: 'Kurigram',
    notes: 'Government emergency flood relief allocation',
    disbursedBy: 'National Disaster Admin (Govt)',
    status: 'Disbursed',
    disbursedAt: new Date(Date.now() - 86400000 * 2)
  },
  {
    _id: 'disb-102',
    ngoName: 'BRAC Disaster Relief Partner',
    ngoId: 'ngo-2',
    amount: 250000,
    district: 'Sylhet',
    notes: 'Relief distribution & medical supplies grant',
    disbursedBy: 'National Disaster Admin (Govt)',
    status: 'Disbursed',
    disbursedAt: new Date(Date.now() - 86400000 * 5)
  }
];

const SEED_TEST_REP_INVITE_ID = 'GR-SYL-TEST01';

const ensurePlatformSeedData = () => {
  if (!inMemoryRepresentativeInvites.some(i => i.inviteId === SEED_TEST_REP_INVITE_ID)) {
    inMemoryRepresentativeInvites.push({
      _id: 'inv-test-01',
      inviteId: SEED_TEST_REP_INVITE_ID,
      name: 'Tariq Gov Field Officer (Test)',
      shelterId: 'sh1',
      shelterName: 'Sylhet Govt College Shelter',
      district: 'Sylhet',
      status: 'Registered',
      registeredUid: 'test-govrep-01',
      createdBy: 'System Seed',
      createdAt: new Date()
    });
  }

  if (!inMemoryNGOInvites.some(i => i.inviteId === 'NR-SYL-TEST01')) {
    inMemoryNGOInvites.push({
      _id: 'ngo-inv-01',
      inviteId: 'NR-SYL-TEST01',
      ngoId: 'test-ngo-01',
      ngoName: 'BRAC Disaster Relief',
      name: 'Kazi NGO Field Rep (Test)',
      email: 'ngorep.test@floodshield.bd',
      campaignId: 'cmp-syl-01',
      campaignName: 'Sylhet Haor Relief Camp',
      district: 'Sylhet',
      status: 'Registered',
      registeredUid: 'test-ngorep-01',
      createdAt: new Date()
    });
  }

  // Permanent seed invite for the 'Sylhet Haor Camp' campaign — Abdur Rouf
  if (!inMemoryNGOInvites.some(i => i.inviteId === 'NR-SYL-541318')) {
    inMemoryNGOInvites.push({
      _id: 'ngo-inv-abdur',
      inviteId: 'NR-SYL-541318',
      ngoId: 'test-ngo-01',
      ngoName: 'BRAC Disaster Relief',
      name: 'Abdur Rouf',
      email: 'abdur230rouf@gmail.com',
      campaignId: 'cmp-syl-01',
      campaignName: 'Sylhet Haor Relief Camp',
      district: 'Sylhet',
      status: 'Pending',
      registeredUid: '',
      createdAt: new Date()
    });
  }

  SEED_CAMPAIGNS.forEach((campaign) => {
    if (!inMemoryCampaigns.some(c => c.campaignId === campaign.campaignId)) {
      inMemoryCampaigns.push({
        _id: `${campaign.campaignId}-id`,
        ...campaign,
        createdAt: new Date()
      });
    }
  });

  const testUsers = [
    { uid: 'test-citizen-01', name: 'Rahim Citizen (Test)', email: 'citizen.test@floodshield.bd', role: 'Citizen', district: 'Sylhet', allocatedArea: 'Sylhet' },
    { uid: 'test-volunteer-01', name: 'Fatema Volunteer (Test)', email: 'volunteer.test@floodshield.bd', role: 'Volunteer', district: 'Sunamganj', allocatedArea: 'Sunamganj', phone: '+8801811998877', latitude: 24.8960, longitude: 91.8740 },
    { uid: 'test-volunteer-02', name: '[BRAC] Mitu Akter Volunteer (Test)', email: 'mitu.test@floodshield.bd', role: 'Volunteer', district: 'Sylhet', allocatedArea: 'Sylhet', latitude: 24.8985, longitude: 91.8710 },
    { uid: 'test-ngo-01', name: 'BRAC Relief Partner (NGO)', email: 'ngo.test@floodshield.bd', role: 'NGO', district: 'Sylhet', orgName: 'BRAC Disaster Relief', allocatedArea: 'Sylhet' },
    { uid: 'test-ngorep-01', name: 'Kazi NGO Field Rep (Test)', email: 'ngorep.test@floodshield.bd', role: 'NGORepresentative', district: 'Sylhet', orgName: 'BRAC Disaster Relief', campaignId: 'cmp-syl-01', campaignName: 'Sylhet Haor Relief Camp', ngoInviteId: 'NR-SYL-TEST01', ngoId: 'test-ngo-01', allocatedArea: 'Sylhet' },
    { uid: 'test-ngorep-logistics-01', name: 'Zahid Logistics Rep (Test)', email: 'ngorep.logistics@floodshield.bd', role: 'NGORepresentative', district: 'Sylhet', orgName: 'BRAC Disaster Relief', assignedHub: '[BRAC] Sylhet Relief Hub [Hub]', ngoId: 'test-ngo-01', allocatedArea: 'Sylhet' },
    { uid: 'test-govrep-01', name: 'Tariq Gov Field Officer (Sylhet Shelter)', email: 'govrep.test@floodshield.bd', role: 'GovRepresentative', district: 'Sylhet', representativeId: 'GR-SYL-TEST01', shelterId: 'sh1', shelterName: 'Sylhet Govt College Shelter', orgName: 'Government (Shelter Ops)', allocatedArea: 'Sylhet' },
    { uid: 'test-govrep-02', name: 'Hasan Gov Field Officer (Sunamganj Shelter)', email: 'govrep.sunamganj@floodshield.bd', role: 'GovRepresentative', district: 'Sunamganj', representativeId: 'GR-SUN-TEST02', shelterId: 'sh2', shelterName: 'Sunamganj Govt High School Shelter', orgName: 'Government (Shelter Ops)', allocatedArea: 'Sunamganj' },
    { uid: 'test-govrep-03', name: 'Rahman Gov Field Officer (Moulvibazar Shelter)', email: 'govrep.moulvibazar@floodshield.bd', role: 'GovRepresentative', district: 'Moulvibazar', representativeId: 'GR-MOU-TEST03', shelterId: 'sh3', shelterName: 'Moulvibazar Stadium Shelter', orgName: 'Government (Shelter Ops)', allocatedArea: 'Moulvibazar' },
    { uid: 'test-govrep-logistics-01', name: 'Karim Gov Logistics Rep (Sylhet Depot)', email: 'govrep.logistics@floodshield.bd', role: 'GovRepresentative', district: 'Sylhet', assignedHub: '[GOV] Sylhet Divisional Depot [Hub]', orgName: 'Government (Logistics)', allocatedArea: 'Sylhet' },
    { uid: 'test-govrep-logistics-02', name: 'Jamal Gov Logistics Rep (Sunamganj Depot)', email: 'govlog.sunamganj@floodshield.bd', role: 'GovRepresentative', district: 'Sunamganj', assignedHub: '[GOV] Sunamganj Disaster Depot [Hub]', orgName: 'Government (Logistics)', allocatedArea: 'Sunamganj' },
    { uid: 'test-govrep-logistics-03', name: 'Kamal Gov Logistics Rep (Moulvibazar Depot)', email: 'govlog.moulvibazar@floodshield.bd', role: 'GovRepresentative', district: 'Moulvibazar', assignedHub: '[GOV] Moulvibazar Emergency Hub [Hub]', orgName: 'Government (Logistics)', allocatedArea: 'Moulvibazar' },
    { uid: 'test-gov-01', name: 'National Disaster Admin (Govt)', email: 'floodshield.gov@test.com', role: 'Government', district: 'Dhaka', orgName: 'Ministry of Disaster Management & Relief', allocatedArea: 'Dhaka' },
    { uid: 'seed-cit-02', name: 'Abdul Karim', email: 'karim@test.bd', role: 'Citizen', district: 'Sunamganj', allocatedArea: 'Sunamganj', latitude: 25.0715, longitude: 91.3992 },
    { uid: 'test-vol-leader-01', name: 'Hassan Field Officer (Sunamganj Shelter)', email: 'hassan.leader@floodshield.bd', role: 'GovRepresentative', district: 'Sunamganj', shelterId: 'sh2', shelterName: 'Sunamganj Govt High School Shelter', orgName: 'Government (Shelter Ops)', allocatedArea: 'Sunamganj', phone: '+8801815190087', latitude: 24.9120, longitude: 91.8680 }
  ];

  testUsers.forEach(tu => {
    let existingIndex = inMemoryUsers.findIndex(u => u.email === tu.email || u.uid === tu.uid);
    if (existingIndex === -1) {
      inMemoryUsers.push({ ...tu, createdAt: new Date(), _seed: true });
    } else {
      inMemoryUsers[existingIndex] = { ...inMemoryUsers[existingIndex], ...tu };
    }
  });

  if (!inMemoryUsers.some(u => u.uid?.startsWith('seed-'))) {
    const seeds = [
      { uid: 'seed-ngo-2', name: 'Ayesha Rahman', email: 'ayesha@careflood.org', role: 'NGO', district: 'Kurigram', allocatedArea: 'Kurigram', orgName: 'Care Flood Response' },
      { uid: 'seed-ngo-3', name: 'Tanvir Islam', email: 'tanvir@disaster-relief.bd', role: 'NGO', district: 'Sunamganj', allocatedArea: 'Sunamganj', orgName: 'Disaster Relief BD' },
      { uid: 'seed-vol-3', name: 'Sabbir Khan', email: 'sabbir.vol@brac.org', role: 'Volunteer', district: 'Gaibandha', allocatedArea: 'Gaibandha', orgName: 'Government (DMRO)' },
      { uid: 'seed-vol-4', name: 'Nadia Parvin', email: 'nadia@floodaid.org', role: 'Volunteer', district: 'Kurigram', allocatedArea: 'Kurigram', orgName: 'FloodAid Bangladesh' },
      { uid: 'seed-rep-1', name: 'Mohammad Ali (Rep)', email: 'mali.rep@shelter.bd', role: 'GovRepresentative', district: 'Moulvibazar', allocatedArea: 'Moulvibazar', orgName: 'Government (Shelter Ops)', representativeId: 'GR-MOU-SEED01', shelterId: 'sh3', shelterName: 'Moulvibazar Stadium Shelter', _seed: true }
    ];
    seeds.forEach(s => inMemoryUsers.push({ ...s, createdAt: new Date(), _seed: true }));
  }

  // Ensure rich roster of NGO and GOV volunteers
  const extraVolunteers = [
    { uid: 'vol-gov-01', name: '[GOV] Jamal Uddin', email: 'jamal.gov@floodshield.bd', role: 'Volunteer', district: 'Sunamganj', orgName: 'Government (DMRO)', assignedTask: 'Relief Support Transport' },
    { uid: 'vol-gov-02', name: '[GOV] Tariqul Islam', email: 'tariqul.gov@floodshield.bd', role: 'Volunteer', district: 'Gaibandha', orgName: 'Government (DMRO)', assignedTask: 'Rescue Operation' },
    { uid: 'vol-gov-03', name: '[GOV] Hasan Mahmud', email: 'hasan.gov@floodshield.bd', role: 'Volunteer', district: 'Netrokona', orgName: 'Government (DMRO)', assignedTask: 'Incident Verification' },
    { uid: 'vol-gov-04', name: '[GOV] Alamgir Hossain', email: 'alamgir.gov@floodshield.bd', role: 'Volunteer', district: 'Jamalpur', orgName: 'Government (DMRO)', assignedTask: 'Relief Support Transport' },
    { uid: 'vol-gov-05', name: '[GOV] Rafiqul Islam (Sylhet)', email: 'rafiqul.gov@floodshield.bd', role: 'Volunteer', district: 'Sylhet', orgName: 'Government (DMRO)', assignedTask: 'Relief Support Transport' },
    { uid: 'vol-gov-06', name: '[GOV] Shahidul Alam (Sylhet)', email: 'shahidul.gov@floodshield.bd', role: 'Volunteer', district: 'Sylhet', orgName: 'Government (DMRO)', assignedTask: 'Rescue Operation' },
    { uid: 'test-volunteer-01-gov', name: '[GOV] Fatema Test Volunteer', email: 'volunteer.gov.test@floodshield.bd', role: 'Volunteer', district: 'Sylhet', orgName: 'Government (DMRO)', assignedTask: 'Relief Support Transport' },
    { uid: 'vol-ngo-01', name: '[BRAC] Mitu Akter', email: 'mitu.brac@floodshield.bd', role: 'Volunteer', district: 'Sylhet', orgName: 'BRAC Disaster Relief', assignedTask: 'Incident Verification' },
    { uid: 'vol-ngo-02', name: '[BRAC] Kafil Ahmed', email: 'kafil.brac@floodshield.bd', role: 'Volunteer', district: 'Kurigram', orgName: 'BRAC Disaster Relief', assignedTask: 'Rescue Operation' },
    { uid: 'vol-ngo-03', name: '[BRAC] Rina Begum', email: 'rina.brac@floodshield.bd', role: 'Volunteer', district: 'Sylhet', orgName: 'BRAC Disaster Relief', assignedTask: 'Relief Support Transport' },
    { uid: 'vol-ngo-04', name: '[BRAC] Popy Begum', email: 'popy.brac@floodshield.bd', role: 'Volunteer', district: 'Bogura', orgName: 'BRAC Disaster Relief', assignedTask: 'Unassigned' }
  ];
  extraVolunteers.forEach((v, idx) => {
    if (!inMemoryUsers.some(u => u.uid === v.uid)) {
      const districtCoords = {
        Sylhet: [24.8949, 91.8687],
        Sunamganj: [25.0658, 91.4072],
        Kurigram: [25.8074, 89.6295],
        Gaibandha: [25.3290, 89.5430],
        Netrokona: [24.8700, 90.7300],
        Jamalpur: [24.9375, 89.9372],
        Bogura: [24.8481, 89.3730],
        Moulvibazar: [24.4843, 91.7700]
      };
      const [lat, lon] = districtCoords[v.district] || districtCoords.Sylhet;
      inMemoryUsers.push({
        ...v,
        latitude: lat + (idx * 0.006),
        longitude: lon + (idx * 0.004),
        createdAt: new Date(),
        _seed: true
      });
    }
  });
};

// Seed Inventory fallbacks - strictly 3 GOV Logistics Hubs and 2 BRAC Hubs
const inMemoryInventory = [
  // BRAC / NGO Logistics Hubs
  { _id: 'inv1', warehouseName: '[BRAC] Sylhet Relief Hub [Hub]', district: 'Sylhet', itemType: 'Food', quantity: 8500, unit: 'bags', lastUpdated: new Date() },
  { _id: 'inv2', warehouseName: '[BRAC] Sylhet Relief Hub [Hub]', district: 'Sylhet', itemType: 'Water', quantity: 15000, unit: 'liters', lastUpdated: new Date() },
  { _id: 'inv3', warehouseName: '[BRAC] Sylhet Relief Hub [Hub]', district: 'Sylhet', itemType: 'Medicine', quantity: 2400, unit: 'kits', lastUpdated: new Date() },
  { _id: 'inv4', warehouseName: '[BRAC] Sylhet Relief Hub [Hub]', district: 'Sylhet', itemType: 'Shelter Kits', quantity: 650, unit: 'packs', lastUpdated: new Date() },

  { _id: 'inv5', warehouseName: '[BRAC] Kurigram Central Warehouse [Hub]', district: 'Kurigram', itemType: 'Food', quantity: 4800, unit: 'bags', lastUpdated: new Date() },
  { _id: 'inv6', warehouseName: '[BRAC] Kurigram Central Warehouse [Hub]', district: 'Kurigram', itemType: 'Water', quantity: 8000, unit: 'liters', lastUpdated: new Date() },
  { _id: 'inv7', warehouseName: '[BRAC] Kurigram Central Warehouse [Hub]', district: 'Kurigram', itemType: 'Medicine', quantity: 1300, unit: 'kits', lastUpdated: new Date() },
  { _id: 'inv8', warehouseName: '[BRAC] Kurigram Central Warehouse [Hub]', district: 'Kurigram', itemType: 'Shelter Kits', quantity: 450, unit: 'packs', lastUpdated: new Date() },

  // 3 Dedicated GOV Logistics Hubs
  { _id: 'inv9', warehouseName: '[GOV] Sylhet Divisional Depot [Hub]', district: 'Sylhet', itemType: 'Food', quantity: 15000, unit: 'bags', lastUpdated: new Date() },
  { _id: 'inv10', warehouseName: '[GOV] Sylhet Divisional Depot [Hub]', district: 'Sylhet', itemType: 'Water', quantity: 22000, unit: 'liters', lastUpdated: new Date() },
  { _id: 'inv11', warehouseName: '[GOV] Sylhet Divisional Depot [Hub]', district: 'Sylhet', itemType: 'Medicine', quantity: 4000, unit: 'kits', lastUpdated: new Date() },
  { _id: 'inv12', warehouseName: '[GOV] Sylhet Divisional Depot [Hub]', district: 'Sylhet', itemType: 'Shelter Kits', quantity: 1800, unit: 'packs', lastUpdated: new Date() },

  { _id: 'inv13', warehouseName: '[GOV] Sunamganj Disaster Depot [Hub]', district: 'Sunamganj', itemType: 'Food', quantity: 12000, unit: 'bags', lastUpdated: new Date() },
  { _id: 'inv14', warehouseName: '[GOV] Sunamganj Disaster Depot [Hub]', district: 'Sunamganj', itemType: 'Water', quantity: 18000, unit: 'liters', lastUpdated: new Date() },
  { _id: 'inv15', warehouseName: '[GOV] Sunamganj Disaster Depot [Hub]', district: 'Sunamganj', itemType: 'Medicine', quantity: 3000, unit: 'kits', lastUpdated: new Date() },
  { _id: 'inv16', warehouseName: '[GOV] Sunamganj Disaster Depot [Hub]', district: 'Sunamganj', itemType: 'Shelter Kits', quantity: 1200, unit: 'packs', lastUpdated: new Date() },

  { _id: 'inv17', warehouseName: '[GOV] Moulvibazar Emergency Hub [Hub]', district: 'Moulvibazar', itemType: 'Food', quantity: 10000, unit: 'bags', lastUpdated: new Date() },
  { _id: 'inv18', warehouseName: '[GOV] Moulvibazar Emergency Hub [Hub]', district: 'Moulvibazar', itemType: 'Water', quantity: 14000, unit: 'liters', lastUpdated: new Date() },
  { _id: 'inv19', warehouseName: '[GOV] Moulvibazar Emergency Hub [Hub]', district: 'Moulvibazar', itemType: 'Medicine', quantity: 2500, unit: 'kits', lastUpdated: new Date() },
  { _id: 'inv20', warehouseName: '[GOV] Moulvibazar Emergency Hub [Hub]', district: 'Moulvibazar', itemType: 'Shelter Kits', quantity: 1000, unit: 'packs', lastUpdated: new Date() },

  // Demo GOV shelter stock (matches Shelter Hub restock naming: "Name (District)")
  { _id: 'inv21', warehouseName: 'test 1 Abdur Rouf (Sylhet)', district: 'Sylhet', itemType: 'Food', quantity: 800, unit: 'bags', lastUpdated: new Date() },
  { _id: 'inv22', warehouseName: 'test 1 Abdur Rouf (Sylhet)', district: 'Sylhet', itemType: 'Water', quantity: 1500, unit: 'liters', lastUpdated: new Date() },
  { _id: 'inv23', warehouseName: 'test 1 Abdur Rouf (Sylhet)', district: 'Sylhet', itemType: 'Medicine', quantity: 120, unit: 'kits', lastUpdated: new Date() },
  { _id: 'inv24', warehouseName: 'test 1 Abdur Rouf (Sylhet)', district: 'Sylhet', itemType: 'Shelter Kits', quantity: 60, unit: 'packs', lastUpdated: new Date() },

  { _id: 'inv25', warehouseName: 'Sylhet Haor Relief Camp (Sylhet)', district: 'Sylhet', itemType: 'Food', quantity: 1200, unit: 'bags', lastUpdated: new Date() },
  { _id: 'inv26', warehouseName: 'Sylhet Haor Relief Camp (Sylhet)', district: 'Sylhet', itemType: 'Water', quantity: 3000, unit: 'liters', lastUpdated: new Date() },
  { _id: 'inv27', warehouseName: 'Sunamganj Haor Emergency Camp (Sunamganj)', district: 'Sunamganj', itemType: 'Food', quantity: 900, unit: 'bags', lastUpdated: new Date() },
  { _id: 'inv28', warehouseName: 'Sunamganj Haor Emergency Camp (Sunamganj)', district: 'Sunamganj', itemType: 'Water', quantity: 2200, unit: 'liters', lastUpdated: new Date() },
  { _id: 'inv29', warehouseName: 'Kurigram Char Relief Camp (Kurigram)', district: 'Kurigram', itemType: 'Food', quantity: 700, unit: 'bags', lastUpdated: new Date() },
  { _id: 'inv30', warehouseName: 'Kurigram Char Relief Camp (Kurigram)', district: 'Kurigram', itemType: 'Water', quantity: 1800, unit: 'liters', lastUpdated: new Date() }
];

// Seed Requests fallbacks
const inMemoryReliefRequests = [
  {
    _id: 'req1',
    villageName: 'Tahirpur North East',
    district: 'Sunamganj',
    contactPerson: 'Rahim Uddin',
    phone: '+8801700112233',
    population: 1200,
    itemType: 'Food',
    quantity: 500,
    priorityScore: 88,
    status: 'Pending',
    reportedAt: new Date(Date.now() - 3 * 3600000)
  },
  {
    _id: 'req2',
    villageName: 'Gowainghat Riverbank',
    district: 'Sylhet',
    contactPerson: 'Mitu Akter',
    phone: '+8801700112234',
    population: 850,
    itemType: 'Water',
    quantity: 2000,
    priorityScore: 74,
    status: 'Pending',
    reportedAt: new Date(Date.now() - 1 * 3600000)
  },
  {
    _id: 'req3',
    villageName: 'Chilmari Char',
    district: 'Kurigram',
    contactPerson: 'Kafil Ahmed',
    phone: '+8801700112235',
    population: 2300,
    itemType: 'Medicine',
    quantity: 400,
    priorityScore: 92,
    status: 'Approved',
    reportedAt: new Date(Date.now() - 5 * 3600000)
  }
];

// Seed Allocations fallbacks
const inMemoryReliefAllocations = [
  {
    _id: "seed-alloc-1",
    requestId: "seed-req-1",
    warehouseName: "[BRAC] Sylhet Relief Hub",
    allocatedItems: [
      { itemType: "Food", quantity: 1100 },
      { itemType: "Medicine", quantity: 400 }
    ],
    routeDistance: 72.8,
    routePath: ["Sylhet Relief Hub", "Tahirpur North East"],
    status: "In Transit",
    dispatchedAt: new Date(Date.now() - 3600000 * 2) // 2 hours ago
  },
  {
    _id: "seed-alloc-2",
    requestId: "seed-req-2",
    warehouseName: "[GOV] Sunamganj Disaster Depot",
    allocatedItems: [
      { itemType: "Water", quantity: 2000 }
    ],
    routeDistance: 58.2,
    routePath: ["Sunamganj Disaster Depot", "Gowainghat Riverbank"],
    status: "Delivered",
    dispatchedAt: new Date(Date.now() - 3600000 * 5), // 5 hours ago
    completedAt: new Date(Date.now() - 3600000 * 4)
  }
];
const inMemoryChatMessages = [];


const findUserByUid = async (uid) => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try {
      let u = await User.findOne({ uid });
      if (u) return u;
    } catch (e) {
      console.error('MongoDB query failed, falling back to in-memory store:', e.message);
    }
  }
  const memUser = inMemoryUsers.find(u => u.uid === uid) || null;
  if (memUser && getIsConnected()) {
    try {
      await User.updateOne({ uid: memUser.uid }, { $setOnInsert: memUser }, { upsert: true });
    } catch (e) { }
  }
  return memUser;
};

const findUserByEmailOrUid = async (email, uid) => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try {
      let u = await User.findOne({ $or: [{ uid }, { email }] });
      if (u) {
        const seedMatch = inMemoryUsers.find(mu => mu._seed && (mu.email === u.email || mu.uid === u.uid));
        if (seedMatch) {
          let modified = false;
          ['shelterId', 'shelterName', 'assignedHub', 'name', 'district', 'allocatedArea'].forEach(key => {
            if (seedMatch[key] !== undefined && u[key] !== seedMatch[key]) {
              u[key] = seedMatch[key];
              modified = true;
            }
          });
          if (modified) await u.save();
        }
        return u;
      }
    } catch (e) {
      console.error('MongoDB query failed, falling back to in-memory store:', e.message);
    }
  }
  const memUser = inMemoryUsers.find(u => u.uid === uid || u.email === email) || null;
  if (memUser && getIsConnected()) {
    try {
      await User.updateOne({ email: memUser.email }, { $setOnInsert: memUser }, { upsert: true });
    } catch (e) { }
  }
  return memUser;
};

const createUser = async (userData) => {
  if (getIsConnected()) {
    try {
      return await User.create(userData);
    } catch (e) {
      console.error('MongoDB insertion failed, falling back to in-memory store:', e.message);
    }
  }

  const newUser = {
    uid: userData.uid,
    name: userData.name,
    email: userData.email,
    role: userData.role || 'Citizen',
    district: userData.district || 'Dhaka',
    allocatedArea: userData.allocatedArea || userData.district || 'Dhaka',
    orgName: userData.orgName || '',
    representativeId: userData.representativeId || '',
    shelterId: userData.shelterId || '',
    shelterName: userData.shelterName || '',
    campaignId: userData.campaignId || '',
    campaignName: userData.campaignName || '',
    assignedHub: userData.assignedHub || '',
    ngoId: userData.ngoId || '',
    ngoInviteId: userData.ngoInviteId || '',
    createdAt: new Date()
  };

  inMemoryUsers.push(newUser);
  console.log(`Registered user in-memory: ${newUser.email} (${newUser.role})`);
  return newUser;
};

const volunteerTaskMap = new Map();

const assignTaskToVolunteer = async (uid, task) => {
  volunteerTaskMap.set(uid, task);
  const u = inMemoryUsers.find(user => user.uid === uid);
  if (u) u.assignedTask = task;
  if (getIsConnected()) {
    try {
      await User.findOneAndUpdate({ uid }, { assignedTask: task });
    } catch (e) {
      console.error('MongoDB assign task error:', e.message);
    }
  }
  return { uid, assignedTask: task };
};

const findVolunteers = async (district = null, excludeUids = []) => {
  const excluded = new Set(excludeUids.filter(Boolean));
  const byUid = new Map();

  const addVolunteer = (uid, name, volDistrict, email = '', assignedTask = '', orgName = '') => {
    if (!uid || !name || excluded.has(uid) || byUid.has(uid)) return;
    const task = volunteerTaskMap.get(uid) || assignedTask || 'Unassigned';
    byUid.set(uid, {
      uid,
      name,
      district: volDistrict || 'General',
      email,
      assignedTask: task,
      orgName: orgName || (name.startsWith('[GOV]') ? 'Government' : name.startsWith('[BRAC]') ? 'BRAC NGO' : 'Volunteer')
    });
  };

  if (getIsConnected()) {
    try {
      const users = await User.find({ role: 'Volunteer' }).sort({ name: 1 });
      users.forEach(u => addVolunteer(u.uid, u.name, u.district, u.email, u.assignedTask, u.orgName));
    } catch (e) {
      console.error('MongoDB volunteer query failed, falling back to in-memory store:', e.message);
    }
  }

  inMemoryUsers.filter(u => u.role === 'Volunteer').forEach(u => {
    addVolunteer(u.uid, u.name, u.district, u.email, u.assignedTask, u.orgName);
  });

  const applications = await findVolunteerApplications({ status: 'Accepted' });
  applications.forEach(a => addVolunteer(a.volunteerUid, a.volunteerName, a.volunteerDistrict));

  const slots = await findVolunteerSlots();
  slots.forEach(s => {
    (s.assignedVolunteers || []).forEach(v => {
      addVolunteer(v.volunteerUid, v.volunteerName, s.district, '', '', s.postedBy);
    });
  });

  let volunteers = Array.from(byUid.values());

  if (district) {
    volunteers.sort((a, b) => {
      const aMatch = a.district === district ? 0 : 1;
      const bMatch = b.district === district ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.name.localeCompare(b.name);
    });
  } else {
    volunteers.sort((a, b) => a.name.localeCompare(b.name));
  }

  return volunteers;
};

// In-memory fallback for Incidents
const inMemoryIncidents = [
  {
    _id: '1',
    title: 'Levee Breach',
    district: 'Sunamganj',
    type: 'Dam Breach',
    desc: 'Surma river levee broken near sadar area, water rushing into residential blocks.',
    lat: 25.0780,
    lng: 91.3850,
    severity: 'Critical',
    status: 'Approved',
    reportedBy: 'FFWC Station',
    aiTags: ['Flood'],
    reportedAt: new Date(Date.now() - 25 * 60000)
  },
  {
    _id: '2',
    title: 'Major Water Logging',
    district: 'Sylhet',
    type: 'Flooded Road',
    desc: 'Major streets in Sylhet city (Upashahar, Shibgonj) submerged under 2-3 feet of water.',
    lat: 24.8910,
    lng: 91.8750,
    severity: 'High',
    status: 'Verified',
    reportedBy: 'Citizen Reporter',
    aiTags: ['Flood', 'Vehicle'],
    reportedAt: new Date(Date.now() - 45 * 60000)
  },
  {
    _id: '3',
    title: 'Stranded Communities',
    district: 'Kurigram',
    type: 'Trapped People',
    desc: '45 families trapped on a low-lying char village requiring urgent dry food and boat evacuation.',
    lat: 25.8150,
    lng: 89.6550,
    severity: 'Critical',
    status: 'Pending',
    reportedBy: 'Volunteer Group',
    aiTags: ['Flood', 'Human', 'Boat'],
    reportedAt: new Date(Date.now() - 80 * 60000)
  }
];

const findIncidents = async () => {
  if (getIsConnected()) {
    try {
      return await Incident.find({}).sort({ reportedAt: -1 });
    } catch (e) {
      console.error('MongoDB incidents query failed, falling back to in-memory store:', e.message);
    }
  }
  return [...inMemoryIncidents].sort((a, b) => b.reportedAt - a.reportedAt);
};

const createIncident = async (incidentData) => {
  if (getIsConnected()) {
    try {
      return await Incident.create(incidentData);
    } catch (e) {
      console.error('MongoDB incident creation failed, falling back to in-memory store:', e.message);
    }
  }

  const newIncident = {
    _id: Math.random().toString(36).substring(2, 9),
    title: incidentData.title,
    district: incidentData.district,
    type: incidentData.type,
    desc: incidentData.desc,
    lat: parseFloat(incidentData.lat),
    lng: parseFloat(incidentData.lng),
    image: incidentData.image || null,
    video: incidentData.video || null,
    severity: incidentData.severity || 'Low',
    status: 'Pending', // default reported state
    reportedBy: incidentData.reportedBy || 'Anonymous Citizen',
    aiTags: incidentData.aiTags || [],
    reportedAt: new Date()
  };

  inMemoryIncidents.push(newIncident);
  console.log(`Reported incident crowdsourced in-memory: ${newIncident.title} (${newIncident.status})`);
  return newIncident;
};

const updateIncidentStatus = async (id, status, verifierOrApproverName, role) => {
  if (getIsConnected()) {
    try {
      const updateData = { status };
      if (role === 'Volunteer') {
        updateData.verifiedBy = verifierOrApproverName;
      } else if (role === 'Government') {
        updateData.approvedBy = verifierOrApproverName;
      }
      return await Incident.findByIdAndUpdate(id, updateData, { new: true });
    } catch (e) {
      console.error('MongoDB incident update failed, falling back to in-memory store:', e.message);
    }
  }

  const idx = inMemoryIncidents.findIndex(i => i._id === id);
  if (idx !== -1) {
    inMemoryIncidents[idx].status = status;
    if (role === 'Volunteer') {
      inMemoryIncidents[idx].verifiedBy = verifierOrApproverName;
    } else if (role === 'Government') {
      inMemoryIncidents[idx].approvedBy = verifierOrApproverName;
    }
    return inMemoryIncidents[idx];
  }
  return null;
};

// --- LOGISTICS FUNCTIONS ---

const findInventory = async () => {
  if (getIsConnected()) {
    try {
      let list = await Inventory.find({});
      if (list.length === 0) {
        // Auto-seed db if empty
        console.log('[Node Backend] Seeding Inventory table...');
        const seeded = await Inventory.insertMany(inMemoryInventory.map(i => ({
          warehouseName: i.warehouseName,
          district: i.district,
          itemType: i.itemType,
          quantity: i.quantity,
          unit: i.unit
        })));
        return seeded;
      } else {
        // Ensure any missing seed inventory items (such as newly added GOV hubs) are synced
        const existingKeys = new Set(list.map(i => `${i.warehouseName}:::${i.itemType}`));
        const missing = inMemoryInventory.filter(i => !existingKeys.has(`${i.warehouseName}:::${i.itemType}`));
        if (missing.length > 0) {
          console.log(`[Node Backend] Adding ${missing.length} new seed inventory items to MongoDB...`);
          await Inventory.insertMany(missing.map(i => ({
            warehouseName: i.warehouseName,
            district: i.district,
            itemType: i.itemType,
            quantity: i.quantity,
            unit: i.unit
          })));
        }
        list = await Inventory.find({});
      }
      return list;
    } catch (e) {
      console.error('MongoDB inventory query failed, falling back to in-memory store:', e.message);
    }
  }
  return inMemoryInventory;
};

const updateStock = async (warehouseName, itemType, quantityToReduce, district = 'Sylhet') => {
  const addedQty = -quantityToReduce;
  if (getIsConnected()) {
    try {
      let inv = await Inventory.findOne({ warehouseName, itemType });
      if (inv) {
        inv.quantity = Math.max(0, inv.quantity - quantityToReduce);
        inv.lastUpdated = new Date();
        return await inv.save();
      } else {
        // Create new inventory item record if it doesn't exist
        const newQty = Math.max(0, addedQty);
        let unitName = 'bags';
        if (itemType === 'Water') unitName = 'liters';
        else if (itemType === 'Medicine') unitName = 'kits';
        else if (itemType === 'Shelter Kits') unitName = 'packs';

        inv = new Inventory({
          warehouseName,
          district,
          itemType,
          quantity: newQty,
          unit: unitName,
          lastUpdated: new Date()
        });
        return await inv.save();
      }
    } catch (e) {
      console.error('MongoDB inventory stock update failed:', e.message);
    }
  }

  let inv = inMemoryInventory.find(i => i.warehouseName === warehouseName && i.itemType === itemType);
  if (inv) {
    inv.quantity = Math.max(0, inv.quantity - quantityToReduce);
    inv.lastUpdated = new Date();
    return inv;
  } else {
    const newQty = Math.max(0, addedQty);
    let unitName = 'bags';
    if (itemType === 'Water') unitName = 'liters';
    else if (itemType === 'Medicine') unitName = 'kits';
    else if (itemType === 'Shelter Kits') unitName = 'packs';
    const newInv = {
      _id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      warehouseName,
      district,
      itemType,
      quantity: newQty,
      unit: unitName,
      lastUpdated: new Date()
    };
    inMemoryInventory.push(newInv);
    return newInv;
  }
};

const findReliefRequests = async () => {
  if (getIsConnected()) {
    try {
      let list = await ReliefRequest.find({}).sort({ priorityScore: -1 });
      if (list.length === 0) {
        console.log('[Node Backend] Seeding ReliefRequest table...');
        const seeded = await ReliefRequest.insertMany(inMemoryReliefRequests.map(r => ({
          villageName: r.villageName,
          district: r.district,
          contactPerson: r.contactPerson,
          phone: r.phone,
          population: r.population,
          itemType: r.itemType,
          quantity: r.quantity,
          priorityScore: r.priorityScore,
          status: r.status
        })));
        return seeded.sort((a, b) => b.priorityScore - a.priorityScore);
      }
      return list;
    } catch (e) {
      console.error('MongoDB relief requests query failed, falling back to in-memory store:', e.message);
    }
  }
  return [...inMemoryReliefRequests].sort((a, b) => b.priorityScore - a.priorityScore);
};

const findReliefRequestById = async (requestId) => {
  if (getIsConnected()) {
    try {
      return await ReliefRequest.findById(requestId);
    } catch (e) {
      console.error('MongoDB relief request lookup failed:', e.message);
    }
  }
  const id = requestId?.toString?.() ?? requestId;
  return inMemoryReliefRequests.find(r => (r._id?.toString?.() ?? r._id) === id) || null;
};

const createReliefRequest = async (requestData) => {
  if (getIsConnected()) {
    try {
      return await ReliefRequest.create(requestData);
    } catch (e) {
      console.error('MongoDB relief request creation failed, falling back to in-memory store:', e.message);
    }
  }

  const newRequest = {
    _id: Math.random().toString(36).substring(2, 9),
    villageName: requestData.villageName,
    district: requestData.district,
    contactPerson: requestData.contactPerson,
    phone: requestData.phone,
    population: parseInt(requestData.population),
    itemType: requestData.itemType,
    quantity: parseInt(requestData.quantity),
    priorityScore: requestData.priorityScore || 50,
    status: requestData.status || 'Pending',
    reportedAt: new Date(),
    submittedByUid: requestData.submittedByUid || '',
    submittedByRole: requestData.submittedByRole || '',
    destinationShelter: requestData.destinationShelter || ''
  };

  inMemoryReliefRequests.push(newRequest);
  return newRequest;
};

const updateRequestStatus = async (id, status) => {
  if (getIsConnected()) {
    try {
      return await ReliefRequest.findByIdAndUpdate(id, { status }, { new: true });
    } catch (e) {
      console.error('MongoDB request status update failed:', e.message);
    }
  }

  const idx = inMemoryReliefRequests.findIndex(r => r._id === id);
  if (idx !== -1) {
    inMemoryReliefRequests[idx].status = status;
    return inMemoryReliefRequests[idx];
  }
  return null;
};

const findAllocations = async () => {
  if (getIsConnected()) {
    try {
      let list = await ReliefAllocation.find({}).sort({ dispatchedAt: -1 });
      if (list.length === 0 && inMemoryReliefAllocations.length > 0) {
        console.log('[Node Backend] Seeding ReliefAllocation table...');
        const seeded = await ReliefAllocation.insertMany(inMemoryReliefAllocations.map(a => ({
          requestId: a.requestId,
          warehouseName: a.warehouseName,
          allocatedItems: a.allocatedItems,
          routeDistance: a.routeDistance,
          routePath: a.routePath,
          status: a.status,
          dispatchedAt: a.dispatchedAt,
          completedAt: a.completedAt
        })));
        return seeded.sort((a, b) => b.dispatchedAt - a.dispatchedAt);
      }
      return list;
    } catch (e) {
      console.error('MongoDB allocations query failed, falling back to in-memory store:', e.message);
    }
  }
  return inMemoryReliefAllocations.sort((a, b) => b.dispatchedAt - a.dispatchedAt);
};

const createAllocation = async (allocationData) => {
  if (getIsConnected()) {
    try {
      // 1. Create allocation document
      const allocation = await ReliefAllocation.create(allocationData);
      return allocation;
    } catch (e) {
      console.error('MongoDB allocation creation failed, falling back to in-memory store:', e.message);
    }
  }

  const newAllocation = {
    _id: Math.random().toString(36).substring(2, 9),
    requestId: allocationData.requestId,
    warehouseName: allocationData.warehouseName,
    allocatedItems: allocationData.allocatedItems,
    routeDistance: allocationData.routeDistance,
    routePath: allocationData.routePath,
    status: 'In Transit',
    dispatchedAt: new Date()
  };

  inMemoryReliefAllocations.push(newAllocation);
  return newAllocation;
};

const findChatHistory = async (userId) => {
  if (getIsConnected()) {
    try {
      return await ChatMessage.find({ userId }).sort({ timestamp: 1 });
    } catch (e) {
      console.error('MongoDB chat messages query failed, falling back to in-memory store:', e.message);
    }
  }
  return inMemoryChatMessages.filter(m => m.userId === userId).sort((a, b) => a.timestamp - b.timestamp);
};

const saveChatMessage = async (messageData) => {
  if (getIsConnected()) {
    try {
      return await ChatMessage.create(messageData);
    } catch (e) {
      console.error('MongoDB chat message creation failed, falling back to in-memory store:', e.message);
    }
  }

  const newMessage = {
    _id: Math.random().toString(36).substring(2, 9),
    userId: messageData.userId,
    sender: messageData.sender,
    message: messageData.message,
    language: messageData.language || 'en',
    outputType: messageData.outputType || 'explanation',
    timestamp: new Date()
  };

  inMemoryChatMessages.push(newMessage);
  return newMessage;
};

// ─── In-memory fallbacks for new models ─────────────────────────────────────────
const inMemoryVolunteerSlots = SEED_VOLUNTEER_SLOTS.map(s => ({ ...s, assignedVolunteers: [...(s.assignedVolunteers || [])] }));
const inMemoryVolunteerApplications = SEED_VOLUNTEER_APPLICATIONS.map(a => ({ ...a }));
const inMemoryDonations = [
  { _id: 'd1', donorName: 'Rahim Uddin', donorUid: 'anon', amount: 500, currency: 'BDT', message: 'Stay strong!', district: 'Sylhet', donatedAt: new Date(Date.now() - 3600000) },
  { _id: 'd2', donorName: 'Fatema Begum', donorUid: 'anon', amount: 1000, currency: 'BDT', message: 'Help the flood victims', district: 'Sunamganj', donatedAt: new Date(Date.now() - 7200000) }
];
const inMemoryNGORequests = [];
const inMemoryShelters = SEED_SHELTERS.map(s => ({ ...s }));
const inMemoryTransports = [
  { _id: 'tr1', allocationId: '', district: 'Sylhet', origin: 'Sylhet Relief Hub', destination: 'Gowainghat Riverbank', itemsSummary: '500 Food bags, 1000L Water', status: 'In Transit', assignedVolunteers: [], estimatedArrival: new Date(Date.now() + 7200000), dispatchedAt: new Date(Date.now() - 3600000), addedBy: 'System', addedByRole: 'Government', chat: [] }
];

const findVolunteerSlots = async () => {
  if (getIsConnected()) {
    try {
      let list = await VolunteerSlot.find().sort({ createdAt: -1 });
      if (list.length === 0) {
        console.log('[Node Backend] Seeding VolunteerSlot table...');
        const seeded = await VolunteerSlot.insertMany(SEED_VOLUNTEER_SLOTS.map(s => ({
          _id: s._id,
          postedBy: s.postedBy,
          postedByRole: s.postedByRole,
          district: s.district,
          taskType: s.taskType,
          volunteersNeeded: s.volunteersNeeded,
          description: s.description,
          assignedVolunteers: s.assignedVolunteers || [],
          status: s.status,
          createdAt: s.createdAt
        })));
        return seeded.sort((a, b) => b.createdAt - a.createdAt);
      }
      return list;
    } catch (e) { console.error(e.message); }
  }
  return [...inMemoryVolunteerSlots].sort((a, b) => b.createdAt - a.createdAt);
};
const createVolunteerSlot = async (data) => {
  if (getIsConnected()) { try { return await VolunteerSlot.create(data); } catch (e) { console.error(e.message); } }
  const slot = { _id: Math.random().toString(36).substring(2, 9), ...data, assignedVolunteers: [], status: 'Open', createdAt: new Date() };
  inMemoryVolunteerSlots.push(slot); return slot;
};
const updateVolunteerSlotStatus = async (slotId, status) => {
  if (getIsConnected()) { try { return await VolunteerSlot.findByIdAndUpdate(slotId, { status }, { new: true }); } catch (e) { console.error(e.message); } }
  const slot = inMemoryVolunteerSlots.find(s => s._id === slotId); if (slot) slot.status = status; return slot;
};
const assignVolunteerToSlot = async (slotId, volunteerInfo) => {
  if (getIsConnected()) { try { return await VolunteerSlot.findByIdAndUpdate(slotId, { $push: { assignedVolunteers: { ...volunteerInfo, assignedAt: new Date() } } }, { new: true }); } catch (e) { console.error(e.message); } }
  const slot = inMemoryVolunteerSlots.find(s => s._id === slotId); if (slot) slot.assignedVolunteers.push({ ...volunteerInfo, assignedAt: new Date() }); return slot;
};
const findVolunteerApplications = async (filter = {}) => {
  if (getIsConnected()) {
    try {
      let list = await VolunteerApplication.find(filter).sort({ appliedAt: -1 });
      // Seed applications only when fetching all (no filter) and collection is empty
      if (list.length === 0 && Object.keys(filter).length === 0) {
        console.log('[Node Backend] Seeding VolunteerApplication table...');
        const seeded = await VolunteerApplication.insertMany(SEED_VOLUNTEER_APPLICATIONS.map(a => ({
          slotId: a.slotId,
          volunteerUid: a.volunteerUid,
          volunteerName: a.volunteerName,
          volunteerDistrict: a.volunteerDistrict,
          message: a.message,
          status: a.status,
          respondedBy: a.respondedBy || '',
          appliedAt: a.appliedAt,
          respondedAt: a.respondedAt || undefined
        })));
        return seeded.sort((a, b) => b.appliedAt - a.appliedAt);
      }
      return list;
    } catch (e) { console.error(e.message); }
  }
  const entries = Object.entries(filter);
  return inMemoryVolunteerApplications.filter(a => entries.every(([k, v]) => a[k] === v));
};
const createVolunteerApplication = async (data) => {
  if (getIsConnected()) { try { return await VolunteerApplication.create(data); } catch (e) { console.error(e.message); } }
  const app = { _id: Math.random().toString(36).substring(2, 9), ...data, status: 'Pending', appliedAt: new Date() };
  inMemoryVolunteerApplications.push(app); return app;
};
const updateApplicationStatus = async (appId, status, respondedBy) => {
  if (getIsConnected()) { try { return await VolunteerApplication.findByIdAndUpdate(appId, { status, respondedBy, respondedAt: new Date() }, { new: true }); } catch (e) { console.error(e.message); } }
  const app = inMemoryVolunteerApplications.find(a => a._id === appId);
  if (app) { app.status = status; app.respondedBy = respondedBy; app.respondedAt = new Date(); } return app;
};
const findDonations = async () => {
  if (getIsConnected()) { try { return await Donation.find().sort({ donatedAt: -1 }); } catch (e) { console.error(e.message); } }
  return [...inMemoryDonations].sort((a, b) => b.donatedAt - a.donatedAt);
};
const createDonation = async (data) => {
  if (getIsConnected()) { try { return await Donation.create(data); } catch (e) { console.error(e.message); } }
  const donation = { _id: Math.random().toString(36).substring(2, 9), ...data, donatedAt: new Date() };
  inMemoryDonations.push(donation); return donation;
};
const getTotalDonations = async () => {
  if (getIsConnected()) { try { const r = await Donation.aggregate([{ $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]); return r[0] || { total: 0, count: 0 }; } catch (e) { console.error(e.message); } }
  return { total: inMemoryDonations.reduce((s, d) => s + d.amount, 0), count: inMemoryDonations.length };
};
const findDisbursements = async () => {
  if (getIsConnected()) { try { return await Disbursement.find().sort({ disbursedAt: -1 }); } catch (e) { console.error(e.message); } }
  return [...inMemoryDisbursements].sort((a, b) => new Date(b.disbursedAt) - new Date(a.disbursedAt));
};
const createDisbursement = async (data) => {
  if (getIsConnected()) { try { return await Disbursement.create(data); } catch (e) { console.error(e.message); } }
  const disb = { _id: Math.random().toString(36).substring(2, 9), ...data, status: 'Disbursed', disbursedAt: new Date() };
  inMemoryDisbursements.push(disb); return disb;
};
const getTotalDisbursed = async () => {
  if (getIsConnected()) { try { const r = await Disbursement.aggregate([{ $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]); return r[0] || { total: 0, count: 0 }; } catch (e) { console.error(e.message); } }
  return { total: inMemoryDisbursements.reduce((s, d) => s + d.amount, 0), count: inMemoryDisbursements.length };
};
const findNGOAllocations = async (ngoName = '') => {
  if (getIsConnected()) {
    try {
      const query = ngoName ? { ngoName: new RegExp(ngoName, 'i') } : {};
      return await NGOAllocation.find(query).sort({ allocatedAt: -1 });
    } catch (e) { console.error(e.message); }
  }
  if (!ngoName) return [...inMemoryNGOAllocations].sort((a, b) => new Date(b.allocatedAt) - new Date(a.allocatedAt));
  return inMemoryNGOAllocations
    .filter(a => a.ngoName.toLowerCase().includes(ngoName.toLowerCase()))
    .sort((a, b) => new Date(b.allocatedAt) - new Date(a.allocatedAt));
};
const createNGOAllocation = async (data) => {
  if (getIsConnected()) { try { return await NGOAllocation.create(data); } catch (e) { console.error(e.message); } }
  const alloc = { _id: Math.random().toString(36).substring(2, 9), ...data, allocatedAt: new Date() };
  inMemoryNGOAllocations.push(alloc); return alloc;
};
const getTotalNGOAllocated = async (ngoName = '') => {
  const allocations = await findNGOAllocations(ngoName);
  return allocations.reduce((s, a) => s + (a.amount || 0), 0);
};
const findFundingRequests = async (filter = {}) => {
  if (getIsConnected()) {
    try {
      const query = { ...filter };
      if (query.orgName) query.orgName = new RegExp(String(query.orgName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      return await FundingRequest.find(query).sort({ createdAt: -1 });
    } catch (e) { console.error(e.message); }
  }
  return inMemoryFundingRequests
    .filter((r) => Object.entries(filter).every(([k, v]) => {
      if (v === undefined || v === null || v === '') return true;
      if (k === 'orgName' && v) {
        return String(r.orgName || '').toLowerCase().includes(String(v).toLowerCase())
          || String(v).toLowerCase().includes(String(r.orgName || '').toLowerCase());
      }
      return r[k] === v;
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
const createFundingRequest = async (data) => {
  if (getIsConnected()) { try { return await FundingRequest.create(data); } catch (e) { console.error(e.message); } }
  const reqItem = {
    _id: Math.random().toString(36).substring(2, 9),
    ...data,
    status: data.status || 'Pending',
    createdAt: new Date()
  };
  inMemoryFundingRequests.push(reqItem);
  return reqItem;
};
const findFundingRequestById = async (id) => {
  if (getIsConnected()) {
    try { return await FundingRequest.findById(id); } catch (e) { console.error(e.message); }
  }
  return inMemoryFundingRequests.find((r) => String(r._id) === String(id)) || null;
};
const updateFundingRequest = async (id, updates) => {
  if (getIsConnected()) {
    try { return await FundingRequest.findByIdAndUpdate(id, updates, { new: true }); } catch (e) { console.error(e.message); }
  }
  const idx = inMemoryFundingRequests.findIndex((r) => String(r._id) === String(id));
  if (idx === -1) return null;
  inMemoryFundingRequests[idx] = { ...inMemoryFundingRequests[idx], ...updates };
  return inMemoryFundingRequests[idx];
};
const findNGORequests = async (filter = {}) => {
  if (getIsConnected()) { try { return await NGORequest.find(filter).sort({ createdAt: -1 }); } catch (e) { console.error(e.message); } }
  const entries = Object.entries(filter); return inMemoryNGORequests.filter(r => entries.every(([k, v]) => r[k] === v));
};
const createNGORequest = async (data) => {
  if (getIsConnected()) { try { return await NGORequest.create(data); } catch (e) { console.error(e.message); } }
  const req = { _id: Math.random().toString(36).substring(2, 9), ...data, status: 'Pending', createdAt: new Date() };
  inMemoryNGORequests.push(req); return req;
};
const updateNGORequestStatus = async (reqId, status, govResponse, respondedBy) => {
  if (getIsConnected()) { try { return await NGORequest.findByIdAndUpdate(reqId, { status, govResponse, respondedBy, respondedAt: new Date() }, { new: true }); } catch (e) { console.error(e.message); } }
  const req = inMemoryNGORequests.find(r => r._id === reqId);
  if (req) { req.status = status; req.govResponse = govResponse; req.respondedBy = respondedBy; } return req;
};
const findShelters = async () => {
  if (getIsConnected()) {
    try {
      let list = await Shelter.find({ active: true }).sort({ createdAt: -1 });
      if (list.length === 0) {
        console.log('[Node Backend] Seeding Shelter table...');
        const seeded = await Shelter.insertMany(SEED_SHELTERS.map(s => ({
          name: s.name,
          lat: s.lat,
          lon: s.lon,
          capacity: s.capacity,
          occupancy: s.occupancy,
          district: s.district,
          addedBy: s.addedBy,
          active: s.active,
          createdAt: s.createdAt
        })));
        return seeded
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((s) => {
            const doc = typeof s.toObject === 'function' ? s.toObject() : s;
            return { ...doc, _id: String(doc._id) };
          });
      } else {
        const existingNames = new Set(list.map(s => s.name));
        const missing = SEED_SHELTERS.filter(s => !existingNames.has(s.name));
        if (missing.length > 0) {
          console.log(`[Node Backend] Adding ${missing.length} missing seed shelters/hubs to MongoDB...`);
          await Shelter.insertMany(missing.map(s => ({
            name: s.name,
            lat: s.lat,
            lon: s.lon,
            capacity: s.capacity,
            occupancy: s.occupancy,
            district: s.district,
            addedBy: s.addedBy,
            active: s.active,
            createdAt: s.createdAt
          })));
          list = await Shelter.find({ active: true }).sort({ createdAt: -1 });
        }
      }
      return list.map((s) => {
        const doc = typeof s.toObject === 'function' ? s.toObject() : s;
        return { ...doc, _id: String(doc._id) };
      });
    } catch (e) { console.error(e.message); }
  }
  return inMemoryShelters.filter(s => s.active);
};
const createShelter = async (data) => {
  if (getIsConnected()) { try { return await Shelter.create(data); } catch (e) { console.error(e.message); } }
  const shelter = { _id: Math.random().toString(36).substring(2, 9), ...data, occupancy: 0, active: true, createdAt: new Date() };
  inMemoryShelters.push(shelter); return shelter;
};
const updateShelter = async (shelterId, updates) => {
  if (getIsConnected()) { try { return await Shelter.findByIdAndUpdate(shelterId, updates, { new: true }); } catch (e) { console.error(e.message); } }
  const shelter = inMemoryShelters.find(s => s._id === shelterId); if (shelter) Object.assign(shelter, updates); return shelter;
};
const findTransports = async () => {
  if (getIsConnected()) { try { return await Transport.find().sort({ dispatchedAt: -1 }); } catch (e) { console.error(e.message); } }
  return [...inMemoryTransports].sort((a, b) => b.dispatchedAt - a.dispatchedAt);
};
const createTransport = async (data) => {
  if (getIsConnected()) { try { return await Transport.create(data); } catch (e) { console.error(e.message); } }
  const transport = {
    _id: Math.random().toString(36).substring(2, 9),
    assignedVolunteers: [],
    chat: [],
    dispatchedAt: new Date(),
    status: 'Pending',
    ...data
  };
  inMemoryTransports.push(transport); return transport;
};
const updateTransportStatus = async (transportId, status, dispatchedByText = '') => {
  if (getIsConnected()) { try { const u = { status }; if (status === 'Delivered') u.deliveredAt = new Date(); if (status === 'In Transit' && dispatchedByText) u.dispatchedByText = dispatchedByText; return await Transport.findByIdAndUpdate(transportId, u, { new: true }); } catch (e) { console.error(e.message); } }
  const t = inMemoryTransports.find(t => t._id === transportId);
  if (t) { t.status = status; if (status === 'Delivered') t.deliveredAt = new Date(); if (status === 'In Transit' && dispatchedByText) t.dispatchedByText = dispatchedByText; } return t;
};
const assignVolunteerToTransport = async (transportId, volunteerInfo) => {
  if (getIsConnected()) { try { return await Transport.findByIdAndUpdate(transportId, { $push: { assignedVolunteers: { ...volunteerInfo, assignedAt: new Date() } } }, { new: true }); } catch (e) { console.error(e.message); } }
  const t = inMemoryTransports.find(t => t._id === transportId);
  if (t) { if (!t.assignedVolunteers) t.assignedVolunteers = []; t.assignedVolunteers.push({ ...volunteerInfo, assignedAt: new Date() }); } return t;
};

// ─── SOS Emergency & Live Radar Store Functions ──────────────────────────────
const findSOSAlerts = async (filter = {}) => {
  if (getIsConnected()) {
    try { return await SOSAlert.find(filter).sort({ createdAt: -1 }); } catch (e) { console.error(e.message); }
  }
  const entries = Object.entries(filter);
  if (entries.length === 0) return [...inMemorySOSAlerts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return inMemorySOSAlerts.filter(s => entries.every(([k, v]) => s[k] === v)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const createSOSAlert = async (data) => {
  let sos;
  if (getIsConnected()) {
    try { sos = await SOSAlert.create(data); } catch (e) { console.error(e.message); }
  }
  if (!sos) {
    sos = { _id: Math.random().toString(36).substring(2, 9), ...data, messages: data.messages || [], createdAt: new Date(), updatedAt: new Date() };
    inMemorySOSAlerts.unshift(sos);
  }
  return sos;
};

const getSOSAlertById = async (id) => {
  if (getIsConnected()) {
    try { return await SOSAlert.findById(id); } catch (e) { console.error(e.message); }
  }
  return inMemorySOSAlerts.find(s => String(s._id) === String(id)) || null;
};

const respondToSOS = async (id, volunteerData) => {
  const isGroup = volunteerData.dispatchType === 'Group';

  // Build the new dispatch entry for dispatches[]
  const dispatchEntry = {
    dispatchType: volunteerData.dispatchType || 'Single',
    volunteerUid: volunteerData.uid || '',
    volunteerName: volunteerData.name || '',
    volunteerPhone: volunteerData.phone || '',
    groupName: isGroup ? (volunteerData.groupName || '') : '',
    logoUrl: volunteerData.logoUrl || '',
    teamMembers: isGroup ? (volunteerData.teamMembers || []) : [],
    latitude: volunteerData.latitude || null,
    longitude: volunteerData.longitude || null,
    dispatchedBy: volunteerData.dispatchedBy || volunteerData.name || '',
    dispatchedByUid: volunteerData.dispatchedByUid || volunteerData.uid || '',
    dispatchedByRole: volunteerData.dispatchedByRole || 'Volunteer',
    dispatchedAt: new Date()
  };

  // Legacy single-field payload (kept for backward compatibility)
  const legacyPayload = {
    dispatchType: volunteerData.dispatchType || 'Single',
    groupName: volunteerData.groupName || '',
    groupLeaderUid: isGroup ? volunteerData.groupLeaderUid : (volunteerData.uid || ''),
    groupLeaderName: isGroup ? (volunteerData.groupLeaderName || volunteerData.name) : (volunteerData.name || ''),
    groupLeaderPhone: isGroup ? (volunteerData.groupLeaderPhone || volunteerData.phone) : (volunteerData.phone || ''),
    teamMembers: isGroup ? (volunteerData.teamMembers || []) : [],
    assignedVolunteerUid: volunteerData.uid || '',
    assignedVolunteerName: volunteerData.name || '',
    assignedVolunteerPhone: volunteerData.phone || '',
    volunteerLatitude: volunteerData.latitude || null,
    volunteerLongitude: volunteerData.longitude || null,
    status: 'Volunteer Dispatched',
    updatedAt: new Date()
  };

  if (getIsConnected()) {
    try {
      return await SOSAlert.findByIdAndUpdate(
        id,
        {
          $push: { dispatches: dispatchEntry },
          ...legacyPayload
        },
        { new: true }
      );
    } catch (e) { console.error(e.message); }
  }
  const sos = inMemorySOSAlerts.find(s => String(s._id) === String(id));
  if (sos) {
    sos.dispatches = sos.dispatches || [];
    sos.dispatches.push({
      ...dispatchEntry,
      _id: `disp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    });
    Object.assign(sos, legacyPayload);
  }
  return sos;
};

const applyDispatchRemainder = (sos) => {
  const remaining = sos.dispatches || [];
  if (remaining.length === 0) {
    sos.status = 'Active SOS';
    sos.dispatchType = 'Single';
    sos.groupName = '';
    sos.groupLeaderUid = '';
    sos.groupLeaderName = '';
    sos.groupLeaderPhone = '';
    sos.teamMembers = [];
    sos.assignedVolunteerUid = '';
    sos.assignedVolunteerName = '';
    sos.assignedVolunteerPhone = '';
    sos.volunteerLatitude = null;
    sos.volunteerLongitude = null;
  } else {
    const last = remaining[remaining.length - 1];
    sos.status = 'Volunteer Dispatched';
    sos.dispatchType = last.dispatchType || 'Single';
    sos.groupName = last.groupName || '';
    sos.groupLeaderUid = last.volunteerUid || '';
    sos.groupLeaderName = last.volunteerName || '';
    sos.groupLeaderPhone = last.volunteerPhone || '';
    sos.teamMembers = last.teamMembers || [];
    sos.assignedVolunteerUid = last.volunteerUid || '';
    sos.assignedVolunteerName = last.volunteerName || '';
    sos.assignedVolunteerPhone = last.volunteerPhone || '';
    sos.volunteerLatitude = last.latitude || null;
    sos.volunteerLongitude = last.longitude || null;
  }
  sos.updatedAt = new Date();
};

const withdrawDispatch = async (sosId, dispatchId) => {
  if (getIsConnected()) {
    try {
      const sos = await SOSAlert.findById(sosId);
      if (!sos) return null;
      const before = (sos.dispatches || []).length;
      sos.dispatches = (sos.dispatches || []).filter(d => String(d._id) !== String(dispatchId));
      if (sos.dispatches.length === before) return { notFound: true, sos };
      applyDispatchRemainder(sos);
      await sos.save();
      return { sos };
    } catch (e) { console.error(e.message); }
  }
  const sos = inMemorySOSAlerts.find(s => String(s._id) === String(sosId));
  if (!sos) return null;
  const before = (sos.dispatches || []).length;
  sos.dispatches = (sos.dispatches || []).filter(d => String(d._id) !== String(dispatchId));
  if (sos.dispatches.length === before) return { notFound: true, sos };
  applyDispatchRemainder(sos);
  return { sos };
};


const addSOSMessage = async (id, messageData) => {
  const msgObj = {
    senderUid: messageData.senderUid,
    senderName: messageData.senderName,
    senderRole: messageData.senderRole,
    text: messageData.text,
    timestamp: new Date()
  };
  if (getIsConnected()) {
    try {
      return await SOSAlert.findByIdAndUpdate(id, {
        $push: { messages: msgObj },
        updatedAt: new Date()
      }, { new: true });
    } catch (e) { console.error(e.message); }
  }
  const sos = inMemorySOSAlerts.find(s => String(s._id) === String(id));
  if (sos) {
    sos.messages = sos.messages || [];
    sos.messages.push(msgObj);
    sos.updatedAt = new Date();
  }
  return sos;
};

const updateSOSLocation = async (id, role, lat, lon) => {
  const updateObj = role === 'Volunteer'
    ? { volunteerLatitude: Number(lat), volunteerLongitude: Number(lon), updatedAt: new Date() }
    : { latitude: Number(lat), longitude: Number(lon), updatedAt: new Date() };

  if (getIsConnected()) {
    try { return await SOSAlert.findByIdAndUpdate(id, updateObj, { new: true }); } catch (e) { console.error(e.message); }
  }
  const sos = inMemorySOSAlerts.find(s => String(s._id) === String(id));
  if (sos) {
    if (role === 'Volunteer') {
      sos.volunteerLatitude = Number(lat);
      sos.volunteerLongitude = Number(lon);
    } else {
      sos.latitude = Number(lat);
      sos.longitude = Number(lon);
    }
    sos.updatedAt = new Date();
  }
  return sos;
};

const updateSOSStatus = async (id, status) => {
  if (getIsConnected()) {
    try { return await SOSAlert.findByIdAndUpdate(id, { status, updatedAt: new Date() }, { new: true }); } catch (e) { console.error(e.message); }
  }
  const sos = inMemorySOSAlerts.find(s => String(s._id) === String(id));
  if (sos) {
    sos.status = status;
    sos.updatedAt = new Date();
  }
  return sos;
};

const addTransportChatMessage = async (transportId, message) => {
  if (getIsConnected()) { try { return await Transport.findByIdAndUpdate(transportId, { $push: { chat: { ...message, sentAt: new Date() } } }, { new: true }); } catch (e) { console.error(e.message); } }
  const t = inMemoryTransports.find(t => t._id === transportId); if (t) t.chat.push({ ...message, sentAt: new Date() }); return t;
};

const updateTransportLoadStatus = async (transportId, loadStatus, assignedHub) => {
  if (getIsConnected()) {
    try {
      const updates = { loadStatus };
      if (assignedHub) {
        updates.assignedHub = assignedHub;
        updates.origin = assignedHub;
      }
      return await Transport.findByIdAndUpdate(transportId, updates, { new: true });
    } catch (e) { console.error(e.message); }
  }
  const tMem = inMemoryTransports.find(t => (t._id?.toString?.() ?? t._id) === (transportId?.toString?.() ?? transportId));
  if (tMem) {
    tMem.loadStatus = loadStatus;
    if (assignedHub) {
      tMem.assignedHub = assignedHub;
      tMem.origin = assignedHub;
    }
  }
  return tMem;
};

const dispatchTransport = async (requestId, allocationId, origin, itemsSummary, estimatedArrival, dispatchedByText = '') => {
  const req = await findReliefRequestById(requestId);
  const destination = req?.villageName || 'Relief Destination';
  const district = req?.district || 'Sylhet';

  if (getIsConnected()) {
    try {
      const updatePayload = {
        allocationId,
        origin,
        destination,
        district,
        itemsSummary,
        estimatedArrival,
        status: 'In Transit',
        loadStatus: 'Loaded'
      };
      if (dispatchedByText) updatePayload.dispatchedByText = dispatchedByText;

      let t = await Transport.findOneAndUpdate(
        { requestId },
        updatePayload,
        { new: true }
      );
      if (!t) {
        t = await Transport.create({
          requestId,
          allocationId,
          origin,
          destination,
          district,
          itemsSummary,
          estimatedArrival,
          status: 'In Transit',
          loadStatus: 'Loaded',
          dispatchedByText,
          addedBy: dispatchedByText || 'Government Admin',
          addedByRole: 'Government'
        });
      }
      return t;
    } catch (e) { console.error(e.message); }
  }

  let t = inMemoryTransports.find(t => t.requestId === requestId);
  if (t) {
    t.allocationId = allocationId;
    t.origin = origin;
    t.destination = destination;
    t.district = district;
    t.itemsSummary = itemsSummary;
    t.estimatedArrival = estimatedArrival;
    t.status = 'In Transit';
    t.loadStatus = 'Loaded';
    if (dispatchedByText) t.dispatchedByText = dispatchedByText;
  } else {
    t = {
      _id: Math.random().toString(36).substring(2, 9),
      requestId,
      allocationId,
      origin,
      destination,
      district,
      itemsSummary,
      estimatedArrival,
      status: 'In Transit',
      loadStatus: 'Loaded',
      dispatchedByText,
      dispatchedAt: new Date(),
      addedBy: dispatchedByText || 'Government Admin',
      addedByRole: 'Government'
    };
    inMemoryTransports.push(t);
  }
  return t;
};

const generateInviteId = (district) => {
  const code = (district || 'DHK').slice(0, 3).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `GR-${code}-${rand}`;
};

const normId = (v) => (v == null ? '' : String(v));

const findRepresentativeInvites = async () => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try { return await RepresentativeInvite.find().sort({ createdAt: -1 }); } catch (e) { console.error(e.message); }
  }
  return [...inMemoryRepresentativeInvites].sort((a, b) => b.createdAt - a.createdAt);
};

const findRepresentativeInviteByInviteId = async (inviteId) => {
  ensurePlatformSeedData();
  const id = inviteId?.trim?.()?.toUpperCase?.() ?? inviteId;
  if (getIsConnected()) {
    try { return await RepresentativeInvite.findOne({ inviteId: id }); } catch (e) { console.error(e.message); }
  }
  return inMemoryRepresentativeInvites.find(i => i.inviteId.toUpperCase() === id) || null;
};

const createRepresentativeInvite = async (data) => {
  const inviteId = (data.inviteId || generateInviteId(data.district)).toUpperCase();
  const payload = { ...data, inviteId, status: 'Pending', registeredUid: '', createdAt: new Date() };
  if (getIsConnected()) {
    try { return await RepresentativeInvite.create(payload); } catch (e) { console.error(e.message); }
  }
  const invite = { _id: Math.random().toString(36).substring(2, 9), ...payload };
  inMemoryRepresentativeInvites.push(invite);
  return invite;
};

const markRepresentativeInviteRegistered = async (inviteId, uid) => {
  const id = inviteId?.trim?.()?.toUpperCase?.() ?? inviteId;
  if (getIsConnected()) {
    try {
      return await RepresentativeInvite.findOneAndUpdate(
        { inviteId: id },
        { status: 'Registered', registeredUid: uid },
        { new: true }
      );
    } catch (e) { console.error(e.message); }
  }
  const invite = inMemoryRepresentativeInvites.find(i => i.inviteId.toUpperCase() === id);
  if (invite) { invite.status = 'Registered'; invite.registeredUid = uid; }
  return invite;
};

const deleteRepresentativeInvite = async (inviteId) => {
  const id = inviteId?.trim?.()?.toUpperCase?.() ?? inviteId;
  if (id === SEED_TEST_REP_INVITE_ID) {
    return { error: 'The test representative invite cannot be deleted' };
  }
  if (getIsConnected()) {
    try {
      const removed = await RepresentativeInvite.findOneAndDelete({ inviteId: id });
      if (!removed) return { error: 'Invite not found' };
      return { removed };
    } catch (e) { console.error(e.message); }
  }
  const idx = inMemoryRepresentativeInvites.findIndex(i => i.inviteId.toUpperCase() === id);
  if (idx === -1) return { error: 'Invite not found' };
  const [removed] = inMemoryRepresentativeInvites.splice(idx, 1);
  return { removed };
};

const findRepresentativeRequests = async (uid = null) => {
  if (getIsConnected()) {
    try {
      const q = uid ? { submittedByUid: uid } : {};
      const docs = await RepresentativeRequest.find(q).sort({ createdAt: -1 });
      if (docs?.length) return docs;
    } catch (e) { console.error(e.message); }
  }
  const list = uid
    ? inMemoryRepresentativeRequests.filter(r => r.submittedByUid === uid)
    : inMemoryRepresentativeRequests;
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
};

const createRepresentativeRequest = async (data) => {
  const payload = {
    ...data,
    reliefRequestId: data.reliefRequestId ? normId(data.reliefRequestId) : '',
    transportId: data.transportId ? normId(data.transportId) : '',
    allocationId: data.allocationId ? normId(data.allocationId) : ''
  };
  if (getIsConnected()) {
    try {
      const doc = await RepresentativeRequest.create(payload);
      if (doc) {
        const plain = doc.toObject ? doc.toObject() : { ...doc };
        if (!inMemoryRepresentativeRequests.some(x => normId(x._id) === normId(plain._id))) {
          inMemoryRepresentativeRequests.push(plain);
        }
        return doc;
      }
    } catch (e) { console.error(e.message); }
  }
  const req = { _id: Math.random().toString(36).substring(2, 9), status: 'Pending', createdAt: new Date(), ...payload };
  inMemoryRepresentativeRequests.push(req);
  return req;
};

const updateRepresentativeRequestStatus = async (id, status, govResponse = '', extra = {}) => {
  const patch = { status, govResponse, respondedAt: new Date(), ...extra };
  if (status === 'Received') patch.receivedAt = new Date();
  if (patch.transportId) patch.transportId = normId(patch.transportId);
  if (patch.allocationId) patch.allocationId = normId(patch.allocationId);
  const rid = normId(id);
  if (getIsConnected()) {
    try {
      const updated = await RepresentativeRequest.findByIdAndUpdate(id, patch, { new: true });
      if (updated) return updated;
    } catch (e) { console.error(e.message); }
  }
  const r = inMemoryRepresentativeRequests.find(x => normId(x._id) === rid);
  if (r) { Object.assign(r, patch); }
  return r;
};

const findRepresentativeRequestByReliefRequestId = async (reliefRequestId) => {
  const id = normId(reliefRequestId);
  if (getIsConnected()) {
    try {
      let doc = await RepresentativeRequest.findOne({ reliefRequestId: id });
      if (!doc) doc = await RepresentativeRequest.findOne({ reliefRequestId: reliefRequestId });
      return doc;
    } catch (e) { console.error(e.message); }
  }
  return inMemoryRepresentativeRequests.find(r => normId(r.reliefRequestId) === id) || null;
};

const findRepresentativeRequestById = async (id) => {
  const rid = normId(id);
  if (getIsConnected()) {
    try {
      const doc = await RepresentativeRequest.findById(id);
      if (doc) return doc;
    } catch (e) { console.error(e.message); }
  }
  return inMemoryRepresentativeRequests.find(r => normId(r._id) === rid) || null;
};

const findRepresentativeRequestByTransportId = async (transportId) => {
  const id = normId(transportId);
  if (getIsConnected()) {
    try { return await RepresentativeRequest.findOne({ transportId: id }); } catch (e) { console.error(e.message); }
  }
  return inMemoryRepresentativeRequests.find(r => normId(r.transportId) === id) || null;
};

const approveRepresentativeRequestOnDispatch = async (reliefRequestId, transportId, allocationId) => {
  const repReq = await findRepresentativeRequestByReliefRequestId(reliefRequestId);
  if (!repReq) return null;
  if (repReq.status === 'Approved' || repReq.status === 'Received') return repReq;
  return updateRepresentativeRequestStatus(repReq._id, 'Approved', 'Dispatched by admin — shipment in transit', {
    transportId: normId(transportId),
    allocationId: normId(allocationId)
  });
};

const markRepresentativeRequestReceived = async (reliefRequestId) => {
  const repReq = await findRepresentativeRequestByReliefRequestId(reliefRequestId);
  if (!repReq || repReq.status === 'Received') return repReq;
  if (repReq.status !== 'Approved' && repReq.status !== 'Pending') return repReq;
  return updateRepresentativeRequestStatus(repReq._id, 'Received', 'Confirmed received at shelter');
};

const markRepresentativeRequestReceivedByTransport = async (transportId, userUid) => {
  let repReq = await findRepresentativeRequestByTransportId(transportId);
  if (!repReq && userUid) {
    const mine = await findRepresentativeRequests(userUid);
    repReq = mine.find(r => r.status === 'Approved') || null;
  }
  if (!repReq || repReq.status === 'Received') return repReq;
  return updateRepresentativeRequestStatus(repReq._id, 'Received', 'Confirmed received at shelter');
};

const findRepresentativeInventory = async (representativeUid) => {
  if (getIsConnected()) {
    try { return await RepresentativeInventory.find({ representativeUid }); } catch (e) { console.error(e.message); }
  }
  return inMemoryRepresentativeInventory.filter(i => i.representativeUid === representativeUid);
};

const UNIT_BY_ITEM = { Food: 'bags', Water: 'liters', Medicine: 'kits', 'Shelter Kits': 'packs' };

const updateRepresentativeInventory = async (representativeUid, shelterName, district, itemType, quantityToAdd) => {
  const unit = UNIT_BY_ITEM[itemType] || 'units';
  if (getIsConnected()) {
    try {
      const existing = await RepresentativeInventory.findOne({ representativeUid, itemType });
      if (existing) {
        existing.quantity = Math.max(0, existing.quantity + quantityToAdd);
        existing.lastUpdated = new Date();
        return await existing.save();
      }
      return await RepresentativeInventory.create({
        representativeUid, shelterName, district, itemType,
        quantity: Math.max(0, quantityToAdd), unit, lastUpdated: new Date()
      });
    } catch (e) { console.error(e.message); }
  }
  let row = inMemoryRepresentativeInventory.find(i => i.representativeUid === representativeUid && i.itemType === itemType);
  if (row) {
    row.quantity = Math.max(0, row.quantity + quantityToAdd);
    row.lastUpdated = new Date();
  } else {
    row = {
      _id: Math.random().toString(36).substring(2, 9),
      representativeUid, shelterName, district, itemType,
      quantity: Math.max(0, quantityToAdd), unit, lastUpdated: new Date()
    };
    inMemoryRepresentativeInventory.push(row);
  }
  return row;
};

function parseItemsSummary(summary) {
  if (!summary) return [];
  return summary.split(',').map(part => {
    const trimmed = part.trim();
    const match = trimmed.match(/^(\d+)\s+(.+)$/);
    if (!match) return null;
    let itemType = match[2].trim();
    if (/^food/i.test(itemType)) itemType = 'Food';
    else if (/^water/i.test(itemType)) itemType = 'Water';
    else if (/^medicine/i.test(itemType)) itemType = 'Medicine';
    else if (/shelter/i.test(itemType)) itemType = 'Shelter Kits';
    return { quantity: parseInt(match[1], 10), itemType };
  }).filter(Boolean);
};

const findTransportById = async (transportId) => {
  const id = transportId?.toString?.() ?? transportId;
  if (getIsConnected()) {
    try { return await Transport.findById(id); } catch (e) { console.error(e.message); }
  }
  return inMemoryTransports.find(t => (t._id?.toString?.() ?? t._id) === id) || null;
};

const placesMatch = (a, b) => {
  const n = (v) => String(v || '').toLowerCase().replace(/[\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
  const s1 = n(a);
  const s2 = n(b);
  if (!s1 || !s2) return false;
  return s1 === s2 || s1.includes(s2) || s2.includes(s1);
};

const receiveTransportForRepresentative = async (transportId, user) => {
  const transport = await findTransportById(transportId);
  if (!transport) return { error: 'Transport not found' };
  if (transport.status === 'Delivered') return { error: 'Shipment already received' };

  // ── RESTOCK transport: credit warehouse inventory directly ──
  if (transport.transportType === 'Restock') {
    const target = transport.restockWarehouse || transport.destination || '';
    const isAdmin = user.role === 'NGO' || user.role === 'Government';
    const hubOk = placesMatch(target, user.assignedHub)
      || placesMatch(target, user.campaignName)
      || placesMatch(target, user.shelterName);
    if (!isAdmin && !hubOk) {
      return { error: 'This restock is not assigned to your hub' };
    }

    let warehouseName = user.assignedHub && placesMatch(target, user.assignedHub)
      ? user.assignedHub
      : target;
    const existingInv = await findInventory();
    const named = existingInv.find(i => placesMatch(i.warehouseName, warehouseName));
    if (named) warehouseName = named.warehouseName;

    const qty = transport.restockQuantity || 0;
    const itemType = transport.restockItemType || '';
    if (warehouseName && itemType && qty > 0) {
      await updateStock(warehouseName, itemType, -qty, transport.district || 'Sylhet');
    }
    if (getIsConnected()) {
      try {
        await Transport.findByIdAndUpdate(transportId, { status: 'Delivered', deliveredAt: new Date(), receivedByUid: user.uid });
      } catch (e) { console.error(e.message); }
    } else {
      const t = inMemoryTransports.find(t => (t._id?.toString?.() ?? t._id) === (transportId?.toString?.() ?? transportId));
      if (t) { t.status = 'Delivered'; t.deliveredAt = new Date(); t.receivedByUid = user.uid; }
    }
    return { transport: { ...transport, status: 'Delivered', receivedByUid: user.uid }, inventoryUpdates: [{ warehouseName, itemType, quantity: qty }], representativeRequest: null };
  }

  // ── VILLAGE transport: credit representative inventory ──
  const shelterName = user.shelterName || '';
  const hubName = user.assignedHub || '';
  const campaignName = user.campaignName || '';
  const dest = transport.destination || '';
  const assignedHubMatch = hubName && placesMatch(transport.assignedHub, hubName);
  const hubDestinationMatch = hubName && (
    placesMatch(dest, hubName) ||
    placesMatch(transport.restockWarehouse, hubName)
  );
  const shelterMatch = shelterName && placesMatch(dest, shelterName);
  const campaignMatch = campaignName && placesMatch(dest, campaignName);
  const uidMatch = transport.representativeUid && transport.representativeUid === user.uid;
  // Also allow if transport requestId links to a relief request the camp submitted
  const requestIdMatch = transport.requestId && transport.requestId !== '';
  if (!assignedHubMatch && !hubDestinationMatch && !shelterMatch && !campaignMatch && !uidMatch && !requestIdMatch) {
    return { error: 'This shipment is not assigned to your hub or shelter' };
  }

  const items = parseItemsSummary(transport.itemsSummary);
  const inventoryUpdates = [];
  const creditLocation = user.shelterName || user.assignedHub || user.campaignName || transport.destination;
  for (const item of items) {
    if (hubDestinationMatch && transport.transportType === 'Restock') {
      // Reallocate to the logistics center's main stock (increase stock, so negative of -quantity)
      await updateStock(hubName, item.itemType, -item.quantity, transport.district || 'Sylhet');
      inventoryUpdates.push({ warehouseName: hubName, itemType: item.itemType, quantity: item.quantity });
    } else {
      const updated = await updateRepresentativeInventory(
        user.uid, creditLocation, user.district, item.itemType, item.quantity
      );
      inventoryUpdates.push(updated);

      // Deduct from originating logistics hub warehouse stock upon delivery receipt
      let originHub = transport.origin || transport.assignedHub;
      if (transport.allocationId) {
        const allocations = await findAllocations();
        const alloc = allocations.find(a => normId(a._id) === normId(transport.allocationId));
        if (alloc && alloc.warehouseName) {
          originHub = alloc.warehouseName;
        }
      }
      if (originHub && originHub !== 'Central Relief Supply Hub' && originHub !== 'Logistics Depot') {
        await updateStock(originHub, item.itemType, item.quantity, transport.district || 'Sylhet');
      }
    }
  }

  if (getIsConnected()) {
    try {
      await Transport.findByIdAndUpdate(transportId, {
        status: 'Delivered', deliveredAt: new Date(), receivedByUid: user.uid
      });
    } catch (e) { console.error(e.message); }
  } else {
    const t = inMemoryTransports.find(t => (t._id?.toString?.() ?? t._id) === (transportId?.toString?.() ?? transportId));
    if (t) {
      t.status = 'Delivered';
      t.deliveredAt = new Date();
      t.receivedByUid = user.uid;
    }
  }

  let repRequest = null;
  if (transport.allocationId) {
    const allocations = await findAllocations();
    const alloc = allocations.find(a => normId(a._id) === normId(transport.allocationId));
    if (alloc) {
      await updateRequestStatus(alloc.requestId, 'Delivered');
      repRequest = await markRepresentativeRequestReceived(alloc.requestId);
    }
  }
  if (!repRequest) {
    repRequest = await markRepresentativeRequestReceivedByTransport(transportId, user.uid);
  }

  return {
    transport: { ...transport, status: 'Delivered', receivedByUid: user.uid },
    inventoryUpdates,
    representativeRequest: repRequest
  };
};

const findUsersByRoles = async (roles = []) => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try {
      const q = roles.length ? { role: { $in: roles } } : {};
      return await User.find(q).sort({ role: 1, name: 1 });
    } catch (e) { console.error(e.message); }
  }
  const list = roles.length ? inMemoryUsers.filter(u => roles.includes(u.role)) : inMemoryUsers;
  return [...list].sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
};

const deleteUserByUid = async (uid) => {
  const user = await findUserByUid(uid);
  if (!user) return { error: 'User not found' };
  if (user.role === 'Government') return { error: 'Government admin accounts cannot be removed' };

  if (user.role === 'GovRepresentative') {
    const invites = await findRepresentativeInvites();
    const invite = invites.find(i => i.registeredUid === uid || i.inviteId === user.representativeId);
    if (invite) {
      if (getIsConnected()) {
        try {
          await RepresentativeInvite.findByIdAndUpdate(invite._id, { status: 'Pending', registeredUid: '' });
        } catch (e) { console.error(e.message); }
      } else {
        invite.status = 'Pending';
        invite.registeredUid = '';
      }
    }
  }

  if (getIsConnected()) {
    try {
      await User.findOneAndDelete({ uid });
    } catch (e) { console.error(e.message); }
  } else {
    const idx = inMemoryUsers.findIndex(u => u.uid === uid);
    if (idx !== -1) inMemoryUsers.splice(idx, 1);
  }
  return { removed: user };
};

const getPlatformRegistry = async () => {
  ensurePlatformSeedData();
  const shelters = await findShelters();
  const invites = await findRepresentativeInvites();
  const users = await findUsersByRoles(['NGO', 'Volunteer', 'GovRepresentative']);

  const shelterRows = shelters.map(s => {
    const sid = s._id?.toString?.() ?? s._id;
    const rep = users.find(u => u.role === 'GovRepresentative' && (u.shelterId === sid || u.shelterName === s.name));
    const pendingInvite = invites.find(i => (i.shelterId === sid || i.shelterName === s.name) && i.status === 'Pending');
    return {
      shelterId: sid,
      shelterName: s.name,
      district: s.district,
      capacity: s.capacity,
      occupancy: s.occupancy,
      representative: rep ? {
        uid: rep.uid,
        name: rep.name,
        email: rep.email,
        representativeId: rep.representativeId,
        status: 'Registered',
        _seed: !!rep._seed
      } : pendingInvite ? {
        uid: '',
        name: pendingInvite.name,
        email: '—',
        representativeId: pendingInvite.inviteId,
        status: 'Pending Registration',
        _seed: false
      } : null
    };
  });

  const mapUser = (u) => ({
    uid: u.uid,
    name: u.name,
    email: u.email,
    district: u.district,
    allocatedArea: u.allocatedArea || u.district,
    orgName: u.orgName || (u.role === 'NGO' ? 'Independent NGO' : u.role === 'Volunteer' ? 'Unaffiliated' : 'Government (Shelter Ops)'),
    _seed: !!u._seed
  });

  return {
    shelters: shelterRows,
    ngos: users.filter(u => u.role === 'NGO').map(mapUser),
    volunteers: users.filter(u => u.role === 'Volunteer').map(mapUser),
    representatives: users.filter(u => u.role === 'GovRepresentative').map(u => ({
      ...mapUser(u),
      representativeId: u.representativeId,
      shelterName: u.shelterName,
      shelterId: u.shelterId
    }))
  };
};

const updateUserRole = async (uid, newRole) => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try {
      const u = await User.findOneAndUpdate({ uid }, { role: newRole }, { new: true });
      if (u) return u;
    } catch (e) {
      console.error('MongoDB updateUserRole failed:', e.message);
    }
  }
  const u = inMemoryUsers.find(x => x.uid === uid);
  if (u) {
    u.role = newRole;
    return u;
  }
  return null;
};

const updateUserProfile = async (uid, updateData) => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try {
      const u = await User.findOneAndUpdate({ uid }, updateData, { new: true });
      if (u) return u;
    } catch (e) {
      console.error('MongoDB updateUserProfile failed:', e.message);
    }
  }
  const u = inMemoryUsers.find(x => x.uid === uid);
  if (u) {
    Object.assign(u, updateData);
    return u;
  }
  return null;
};

// Campaign helper methods
const findCampaigns = async (filter = {}) => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try {
      return await Campaign.find(filter).sort({ createdAt: -1 });
    } catch (e) { console.error('MongoDB findCampaigns failed:', e.message); }
  }
  return inMemoryCampaigns.filter(c => {
    if (filter.ngoId && c.ngoId !== filter.ngoId) return false;
    if (filter.status && c.status !== filter.status) return false;
    return true;
  });
};

const findCampaignByCampaignId = async (campaignId) => {
  ensurePlatformSeedData();
  const wanted = String(campaignId || '').trim();
  if (getIsConnected()) {
    try {
      let campaign = await Campaign.findOne({ campaignId: wanted });
      if (!campaign && /^[a-fA-F0-9]{24}$/.test(wanted)) {
        campaign = await Campaign.findById(wanted);
      }
      return campaign;
    } catch (e) { console.error('MongoDB findCampaignByCampaignId failed:', e.message); }
  }
  return inMemoryCampaigns.find(c => c.campaignId === wanted || String(c._id) === wanted) || null;
};

const createCampaign = async (campaignData) => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try {
      return await Campaign.create(campaignData);
    } catch (e) { console.error('MongoDB createCampaign failed:', e.message); }
  }
  const newC = {
    _id: 'cmp-' + Date.now(),
    campaignId: campaignData.campaignId,
    name: campaignData.name,
    ngoId: campaignData.ngoId,
    ngoName: campaignData.ngoName,
    district: campaignData.district,
    lat: campaignData.lat,
    lon: campaignData.lon,
    capacity: campaignData.capacity || 500,
    occupancy: campaignData.occupancy || 0,
    contactPhone: campaignData.contactPhone || '',
    status: campaignData.status || 'Active',
    inventory: campaignData.inventory || { dryFood: 1000, waterBottles: 2000, medicalKits: 150, hygienePacks: 300, shelterKits: 100 },
    createdAt: new Date()
  };
  inMemoryCampaigns.push(newC);
  return newC;
};

const updateCampaign = async (campaignId, updateData) => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try {
      return await Campaign.findOneAndUpdate({ campaignId }, updateData, { new: true });
    } catch (e) { console.error('MongoDB updateCampaign failed:', e.message); }
  }
  const idx = inMemoryCampaigns.findIndex(c => c.campaignId === campaignId);
  if (idx !== -1) {
    inMemoryCampaigns[idx] = { ...inMemoryCampaigns[idx], ...updateData };
    return inMemoryCampaigns[idx];
  }
  return null;
};

// NGOInvite helper methods
const findNGOInvites = async (ngoId) => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try {
      return await NGOInvite.find({ ngoId }).sort({ createdAt: -1 });
    } catch (e) { console.error('MongoDB findNGOInvites failed:', e.message); }
  }
  return inMemoryNGOInvites.filter(i => i.ngoId === ngoId);
};

const findNGOInviteByInviteId = async (inviteId) => {
  ensurePlatformSeedData();
  const cleanId = (inviteId || '').trim();
  if (!cleanId) return null;

  if (getIsConnected()) {
    try {
      let doc = await NGOInvite.findOne({ inviteId: cleanId });
      if (!doc) {
        doc = await NGOInvite.findOne({ inviteId: new RegExp(`^${cleanId}$`, 'i') });
      }
      if (doc) return doc;
    } catch (e) { console.error('MongoDB findNGOInviteByInviteId failed:', e.message); }
  }

  const upper = cleanId.toUpperCase();
  return inMemoryNGOInvites.find(i =>
    (i.inviteId || '').trim().toUpperCase() === upper ||
    (i.inviteId || '').trim() === cleanId
  ) || null;
};

const createNGOInvite = async (inviteData) => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try {
      return await NGOInvite.create(inviteData);
    } catch (e) { console.error('MongoDB createNGOInvite failed:', e.message); }
  }
  const newInv = {
    _id: 'ngo-inv-' + Date.now(),
    inviteId: inviteData.inviteId,
    ngoId: inviteData.ngoId,
    ngoName: inviteData.ngoName,
    name: inviteData.name,
    email: inviteData.email || '',
    campaignId: inviteData.campaignId || '',
    campaignName: inviteData.campaignName || '',
    assignedHub: inviteData.assignedHub || '',
    district: inviteData.district,
    status: 'Pending',
    registeredUid: '',
    createdAt: new Date()
  };
  inMemoryNGOInvites.push(newInv);
  return newInv;
};

const markNGOInviteRegistered = async (inviteId, registeredUid) => {
  ensurePlatformSeedData();
  const cleanId = (inviteId || '').trim();
  const upper = cleanId.toUpperCase();

  if (getIsConnected()) {
    try {
      let updated = await NGOInvite.findOneAndUpdate({ inviteId: cleanId }, { status: 'Registered', registeredUid }, { new: true });
      if (!updated) {
        updated = await NGOInvite.findOneAndUpdate({ inviteId: new RegExp(`^${cleanId}$`, 'i') }, { status: 'Registered', registeredUid }, { new: true });
      }
      if (updated) return updated;
    } catch (e) { console.error('MongoDB markNGOInviteRegistered failed:', e.message); }
  }

  const inv = inMemoryNGOInvites.find(i => (i.inviteId || '').trim().toUpperCase() === upper || (i.inviteId || '').trim() === cleanId);
  if (inv) {
    inv.status = 'Registered';
    inv.registeredUid = registeredUid;
    return inv;
  }
  return null;
};

// CampaignRequest helper methods
const findCampaignRequests = async (filter = {}) => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try {
      return await CampaignRequest.find(filter).sort({ createdAt: -1 });
    } catch (e) { console.error('MongoDB findCampaignRequests failed:', e.message); }
  }
  return inMemoryCampaignRequests.filter(r => {
    if (filter.ngoId && r.ngoId !== filter.ngoId) return false;
    if (filter.representativeId && r.representativeId !== filter.representativeId) return false;
    if (filter.campaignId && r.campaignId !== filter.campaignId) return false;
    return true;
  });
};

const createCampaignRequest = async (reqData) => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try {
      return await CampaignRequest.create(reqData);
    } catch (e) { console.error('MongoDB createCampaignRequest failed:', e.message); }
  }
  const newR = {
    _id: 'cmp-req-' + Date.now(),
    ...reqData,
    status: 'Pending',
    fundingAmount: 0,
    responseNote: '',
    createdAt: new Date()
  };
  inMemoryCampaignRequests.push(newR);
  return newR;
};

const updateCampaignRequestStatus = async (id, updateData) => {
  ensurePlatformSeedData();
  if (getIsConnected()) {
    try {
      return await CampaignRequest.findByIdAndUpdate(id, updateData, { new: true });
    } catch (e) { console.error('MongoDB updateCampaignRequestStatus failed:', e.message); }
  }
  const r = inMemoryCampaignRequests.find(x => String(x._id) === String(id));
  if (r) {
    Object.assign(r, updateData);
    return r;
  }
  return null;
};

const omitId = (doc) => {
  if (!doc || typeof doc !== 'object') return doc;
  const copy = { ...doc };
  delete copy._id;
  delete copy._seed;
  return copy;
};

const omitDispatchIds = (sos) => {
  const doc = omitId(sos);
  doc.dispatches = (doc.dispatches || []).map((d) => omitId(d));
  return doc;
};

const seedDemoDataToMongo = async () => {
  if (!getIsConnected()) return;
  ensurePlatformSeedData();
  console.log('[Node Backend] Syncing demo seed data to MongoDB...');

  const userPayload = (u) => ({
    uid: u.uid,
    name: u.name,
    email: u.email,
    role: u.role,
    district: u.district || 'Dhaka',
    allocatedArea: u.allocatedArea || u.district || '',
    orgName: u.orgName || '',
    representativeId: u.representativeId || '',
    shelterId: u.shelterId || '',
    shelterName: u.shelterName || '',
    campaignId: u.campaignId || '',
    campaignName: u.campaignName || '',
    assignedHub: u.assignedHub || '',
    ngoId: u.ngoId || '',
    ngoInviteId: u.ngoInviteId || '',
    assignedTask: u.assignedTask || '',
    phone: u.phone || '',
    latitude: u.latitude ?? null,
    longitude: u.longitude ?? null
  });

  try {
    for (const u of inMemoryUsers) {
      if (!u?.uid || !u?.email) continue;
      try {
        await User.updateOne(
          { uid: u.uid },
          { $setOnInsert: userPayload(u) },
          { upsert: true }
        );
      } catch (e) {
        if (!String(e.message || '').includes('duplicate')) {
          console.error('User seed skip:', u.email, e.message);
        }
      }
    }

    const sosExisting = await SOSAlert.find({
      citizenUid: { $in: inMemorySOSAlerts.map((s) => s.citizenUid) }
    }).lean();
    const sosHave = new Set(sosExisting.map((s) => `${s.citizenUid}:::${s.villageName || ''}`));
    const sosMissing = inMemorySOSAlerts.filter((s) => !sosHave.has(`${s.citizenUid}:::${s.villageName || ''}`));
    if (sosMissing.length) {
      await SOSAlert.insertMany(sosMissing.map(omitDispatchIds));
      console.log(`[Node Backend] Seeded ${sosMissing.length} SOS alerts`);
    }

    const incidentExisting = await Incident.find({
      title: { $in: inMemoryIncidents.map((i) => i.title) }
    }).lean();
    const incidentHave = new Set(incidentExisting.map((i) => `${i.title}:::${i.district}`));
    const incidentMissing = inMemoryIncidents.filter((i) => !incidentHave.has(`${i.title}:::${i.district}`));
    if (incidentMissing.length) {
      await Incident.insertMany(incidentMissing.map(omitId));
      console.log(`[Node Backend] Seeded ${incidentMissing.length} incidents`);
    }

    await findInventory();
    await findShelters();
    await findVolunteerSlots();
    const existingSlots = await VolunteerSlot.find({ _id: { $in: SEED_VOLUNTEER_SLOTS.map((s) => s._id) } }).lean();
    const haveSlot = new Set(existingSlots.map((s) => String(s._id)));
    const missingSlots = SEED_VOLUNTEER_SLOTS.filter((s) => !haveSlot.has(String(s._id)));
    if (missingSlots.length) {
      await VolunteerSlot.insertMany(missingSlots);
      console.log(`[Node Backend] Seeded ${missingSlots.length} volunteer slots`);
    }

    await findVolunteerApplications();
    const existingApps = await VolunteerApplication.find({
      volunteerUid: { $in: SEED_VOLUNTEER_APPLICATIONS.map((a) => a.volunteerUid) }
    }).lean();
    const haveApp = new Set(existingApps.map((a) => `${a.slotId}:::${a.volunteerUid}`));
    const missingApps = SEED_VOLUNTEER_APPLICATIONS.filter((a) => !haveApp.has(`${a.slotId}:::${a.volunteerUid}`));
    if (missingApps.length) {
      await VolunteerApplication.insertMany(missingApps.map(omitId));
      console.log(`[Node Backend] Seeded ${missingApps.length} volunteer applications`);
    }

    await findReliefRequests();
    await findAllocations();

    const donationExisting = await Donation.find({
      donorName: { $in: inMemoryDonations.map((d) => d.donorName) }
    }).lean();
    const donationHave = new Set(donationExisting.map((d) => `${d.donorName}:::${d.amount}:::${d.district}`));
    const donationMissing = inMemoryDonations.filter((d) => !donationHave.has(`${d.donorName}:::${d.amount}:::${d.district}`));
    if (donationMissing.length) {
      await Donation.insertMany(donationMissing.map(omitId));
      console.log(`[Node Backend] Seeded ${donationMissing.length} donations`);
    }

    const transportExisting = await Transport.find({
      origin: { $in: inMemoryTransports.map((t) => t.origin) }
    }).lean();
    const transportHave = new Set(transportExisting.map((t) => `${t.origin}:::${t.destination}:::${t.itemsSummary}`));
    const transportMissing = inMemoryTransports.filter((t) => !transportHave.has(`${t.origin}:::${t.destination}:::${t.itemsSummary}`));
    if (transportMissing.length) {
      await Transport.insertMany(transportMissing.map(omitId));
      console.log(`[Node Backend] Seeded ${transportMissing.length} transports`);
    }

    const disbExisting = await Disbursement.find({
      ngoName: { $in: inMemoryDisbursements.map((d) => d.ngoName) }
    }).lean();
    const disbHave = new Set(disbExisting.map((d) => `${d.ngoName}:::${d.amount}:::${d.district}`));
    const disbMissing = inMemoryDisbursements.filter((d) => !disbHave.has(`${d.ngoName}:::${d.amount}:::${d.district}`));
    if (disbMissing.length) {
      await Disbursement.insertMany(disbMissing.map(omitId));
      console.log(`[Node Backend] Seeded ${disbMissing.length} disbursements`);
    }

    const allocExisting = await NGOAllocation.find({
      targetId: { $in: inMemoryNGOAllocations.map((a) => a.targetId) }
    }).lean();
    const allocHave = new Set(allocExisting.map((a) => `${a.targetId}:::${a.amount}`));
    const allocMissing = inMemoryNGOAllocations.filter((a) => !allocHave.has(`${a.targetId}:::${a.amount}`));
    if (allocMissing.length) {
      await NGOAllocation.insertMany(allocMissing.map(omitId));
      console.log(`[Node Backend] Seeded ${allocMissing.length} NGO allocations`);
    }

    for (const c of inMemoryCampaigns) {
      await Campaign.updateOne(
        { campaignId: c.campaignId },
        { $setOnInsert: omitId(c) },
        { upsert: true }
      );
    }

    for (const i of inMemoryNGOInvites) {
      await NGOInvite.updateOne(
        { inviteId: i.inviteId },
        { $setOnInsert: omitId(i) },
        { upsert: true }
      );
    }

    for (const i of inMemoryRepresentativeInvites) {
      await RepresentativeInvite.updateOne(
        { inviteId: i.inviteId },
        { $setOnInsert: omitId(i) },
        { upsert: true }
      );
    }

    console.log('[Node Backend] Demo seed sync complete.');
  } catch (e) {
    console.error('[Node Backend] Demo seed sync failed:', e.message);
  }
};

module.exports = {
  findUserByUid,
  findUserByEmailOrUid,
  createUser,
  updateUserRole,

  // Incidents
  findIncidents,
  createIncident,
  updateIncidentStatus,

  // Logistics
  findInventory,
  updateStock,
  findReliefRequests,
  findReliefRequestById,
  createReliefRequest,
  updateRequestStatus,
  findAllocations,
  createAllocation,

  // Chat/AI
  findChatHistory,
  saveChatMessage,

  // Volunteer Hub
  findVolunteerSlots,
  createVolunteerSlot,
  updateVolunteerSlotStatus,
  assignVolunteerToSlot,
  findVolunteerApplications,
  createVolunteerApplication,
  updateApplicationStatus,
  findVolunteers,

  // Donations & NGO Grants
  findDonations,
  createDonation,
  getTotalDonations,
  findDisbursements,
  createDisbursement,
  getTotalDisbursed,
  findNGOAllocations,
  createNGOAllocation,
  getTotalNGOAllocated,
  findFundingRequests,
  createFundingRequest,
  findFundingRequestById,
  updateFundingRequest,

  // NGO Requests
  findNGORequests,
  createNGORequest,
  updateNGORequestStatus,

  // Shelters
  findShelters,
  createShelter,
  updateShelter,

  // Campaigns
  findCampaigns,
  findCampaignByCampaignId,
  createCampaign,
  updateCampaign,

  // NGO Invites
  findNGOInvites,
  findNGOInviteByInviteId,
  createNGOInvite,
  markNGOInviteRegistered,

  // Campaign Requests
  findCampaignRequests,
  createCampaignRequest,
  updateCampaignRequestStatus,

  // Transport
  findTransports,
  findTransportById,
  createTransport,
  updateTransportStatus,
  assignVolunteerToTransport,
  addTransportChatMessage,
  updateTransportLoadStatus,
  receiveTransportForRepresentative,
  dispatchTransport,
  assignTaskToVolunteer,

  // Government Representatives
  findRepresentativeInvites,
  findRepresentativeInviteByInviteId,
  createRepresentativeInvite,
  markRepresentativeInviteRegistered,
  findRepresentativeRequests,
  createRepresentativeRequest,
  updateRepresentativeRequestStatus,
  findRepresentativeRequestByReliefRequestId,
  findRepresentativeRequestById,
  findRepresentativeRequestByTransportId,
  approveRepresentativeRequestOnDispatch,
  markRepresentativeRequestReceived,
  markRepresentativeRequestReceivedByTransport,
  findRepresentativeInventory,
  updateRepresentativeInventory,
  deleteRepresentativeInvite,
  generateInviteId,
  updateUserProfile,
  getPlatformRegistry,
  deleteUserByUid,
  findUsersByRoles,

  // SOS Emergency & Radar
  findSOSAlerts,
  createSOSAlert,
  getSOSAlertById,
  respondToSOS,
  withdrawDispatch,
  addSOSMessage,
  updateSOSLocation,
  updateSOSStatus,
  seedDemoDataToMongo
};
