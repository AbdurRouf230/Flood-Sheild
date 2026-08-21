/**
 * Demo seed data for volunteer hub, applications, and shelter registry.
 * Used by dbStore in-memory fallbacks and MongoDB auto-seed on empty collections.
 */

const daysAgo = (d) => new Date(Date.now() - d * 86400000);
const hoursAgo = (h) => new Date(Date.now() - h * 3600000);

// Stable MongoDB-compatible ObjectId strings for seed records
const SLOT = {
  vs1: '675a00000000000000000001', vs2: '675a00000000000000000002', vs3: '675a00000000000000000003',
  vs4: '675a00000000000000000004', vs5: '675a00000000000000000005', vs6: '675a00000000000000000006',
  vs7: '675a00000000000000000007', vs8: '675a00000000000000000008', vs9: '675a00000000000000000009',
  vs10: '675a0000000000000000000a', vs11: '675a0000000000000000000b', vs12: '675a0000000000000000000c',
  vs13: '675a0000000000000000000d', vs14: '675a0000000000000000000e', vs15: '675a0000000000000000000f',
  vs16: '675a00000000000000000010'
};

const SEED_VOLUNTEER_SLOTS = [
  {
    _id: SLOT.vs1,
    postedBy: 'BRAC Disaster Response',
    postedByRole: 'NGO',
    district: 'Sunamganj',
    taskType: 'Search & Rescue',
    volunteersNeeded: 8,
    description: 'Boat rescue teams needed in Tahirpur and Chhatak haor areas. Life jackets provided on site.',
    assignedVolunteers: [
      { volunteerUid: 'vol-001', volunteerName: 'Karim Ahmed', assignedAt: daysAgo(2) },
      { volunteerUid: 'vol-002', volunteerName: 'Nusrat Jahan', assignedAt: daysAgo(1) }
    ],
    status: 'Open',
    createdAt: daysAgo(5)
  },
  {
    _id: SLOT.vs2,
    postedBy: 'DMRO Sylhet',
    postedByRole: 'Government',
    district: 'Sylhet',
    taskType: 'Supply Distribution',
    volunteersNeeded: 6,
    description: 'Pack and distribute dry food, ORS, and water pouches at Sylhet Relief Hub warehouse.',
    assignedVolunteers: [],
    status: 'Open',
    createdAt: daysAgo(4)
  },
  {
    _id: SLOT.vs3,
    postedBy: 'Friendship NGO',
    postedByRole: 'NGO',
    district: 'Kurigram',
    taskType: 'Shelter Support',
    volunteersNeeded: 12,
    description: 'Assist char-dweller families at Kurigram Degree College shelter — registration, bedding, hygiene kits.',
    assignedVolunteers: [
      { volunteerUid: 'vol-003', volunteerName: 'Abdul Halim', assignedAt: daysAgo(3) }
    ],
    status: 'Open',
    createdAt: daysAgo(6)
  },
  {
    _id: SLOT.vs4,
    postedBy: 'Feni District Admin',
    postedByRole: 'Government',
    district: 'Feni',
    taskType: 'Search & Rescue',
    volunteersNeeded: 10,
    description: 'Urgent: flash-flood evacuation support along Muhuri River embankment. Swimming ability preferred.',
    assignedVolunteers: [],
    status: 'Open',
    createdAt: daysAgo(1)
  },
  {
    _id: SLOT.vs5,
    postedBy: 'Dhaka Community Aid',
    postedByRole: 'NGO',
    district: 'Gaibandha',
    taskType: 'Medical Aid',
    volunteersNeeded: 5,
    description: 'First-aid volunteers for mobile medical camp at Gaibandha Pilot School shelter.',
    assignedVolunteers: [],
    status: 'Open',
    createdAt: daysAgo(3)
  },
  {
    _id: SLOT.vs6,
    postedBy: 'DMRO Netrokona',
    postedByRole: 'Government',
    district: 'Netrokona',
    taskType: 'Transport Escort',
    volunteersNeeded: 4,
    description: 'Escort relief trucks on submerged roads between Netrokona depot and Atpara union.',
    assignedVolunteers: [],
    status: 'Open',
    createdAt: daysAgo(2)
  },
  {
    _id: SLOT.vs7,
    postedBy: 'CARE Bangladesh',
    postedByRole: 'NGO',
    district: 'Sirajganj',
    taskType: 'Data Collection',
    volunteersNeeded: 6,
    description: 'Field survey of affected households for relief needs assessment along Jamuna riverbank.',
    assignedVolunteers: [],
    status: 'Open',
    createdAt: daysAgo(7)
  },
  {
    _id: SLOT.vs8,
    postedBy: 'Jamalpur DMRO',
    postedByRole: 'Government',
    district: 'Jamalpur',
    taskType: 'Supply Distribution',
    volunteersNeeded: 8,
    description: 'Distribute rice, lentils, and water at Jamalpur Govt College temporary shelter.',
    assignedVolunteers: [
      { volunteerUid: 'vol-004', volunteerName: 'Shamima Akter', assignedAt: daysAgo(1) },
      { volunteerUid: 'vol-005', volunteerName: 'Rafiqul Islam', assignedAt: daysAgo(1) }
    ],
    status: 'Open',
    createdAt: daysAgo(4)
  },
  {
    _id: SLOT.vs9,
    postedBy: 'Coastal Resilience NGO',
    postedByRole: 'NGO',
    district: 'Khulna',
    taskType: 'Shelter Support',
    volunteersNeeded: 15,
    description: 'Tidal surge preparedness — help relocate coastal families to Khulna cyclone shelter cluster.',
    assignedVolunteers: [],
    status: 'Open',
    createdAt: daysAgo(2)
  },
  {
    _id: SLOT.vs10,
    postedBy: 'Chattogram DMRO',
    postedByRole: 'Government',
    district: 'Chittagong',
    taskType: 'Search & Rescue',
    volunteersNeeded: 7,
    description: 'Urban waterlogging rescue in Halishahar and Agrabad industrial zone.',
    assignedVolunteers: [],
    status: 'Open',
    createdAt: daysAgo(1)
  },
  {
    _id: SLOT.vs11,
    postedBy: 'Prothom Alo Trust',
    postedByRole: 'NGO',
    district: 'Bogura',
    taskType: 'Medical Aid',
    volunteersNeeded: 4,
    description: 'Support mobile health unit treating waterborne disease cases at Bogura flood shelter.',
    assignedVolunteers: [],
    status: 'Open',
    createdAt: daysAgo(5)
  },
  {
    _id: SLOT.vs12,
    postedBy: 'DMRO Comilla',
    postedByRole: 'Government',
    district: 'Comilla',
    taskType: 'Transport Escort',
    volunteersNeeded: 5,
    description: 'Guide relief convoys through flood-affected Laksam and Nangalkot routes.',
    assignedVolunteers: [],
    status: 'Open',
    createdAt: hoursAgo(18)
  },
  {
    _id: SLOT.vs13,
    postedBy: 'Barishal Coastal Watch',
    postedByRole: 'NGO',
    district: 'Barishal',
    taskType: 'Shelter Support',
    volunteersNeeded: 10,
    description: 'Manage occupancy and sanitation at Barishal river-port emergency shelter.',
    assignedVolunteers: [
      { volunteerUid: 'vol-006', volunteerName: 'Mizanur Rahman', assignedAt: daysAgo(2) }
    ],
    status: 'Open',
    createdAt: daysAgo(3)
  },
  {
    _id: SLOT.vs14,
    postedBy: 'Lalmonirhat DMRO',
    postedByRole: 'Government',
    district: 'Lalmonirhat',
    taskType: 'Supply Distribution',
    volunteersNeeded: 6,
    description: 'Teesta river flood relief — distribute food packs to Patgram border-area villages.',
    assignedVolunteers: [],
    status: 'Open',
    createdAt: daysAgo(2)
  },
  {
    _id: SLOT.vs15,
    postedBy: 'Sylhet Youth Corps',
    postedByRole: 'NGO',
    district: 'Sylhet',
    taskType: 'Data Collection',
    volunteersNeeded: 4,
    description: 'Crowdsource verified water-level readings from Surma river communities (smartphone + GPS).',
    assignedVolunteers: [
      { volunteerUid: 'vol-007', volunteerName: 'Tanvir Hasan', assignedAt: daysAgo(4) },
      { volunteerUid: 'vol-008', volunteerName: 'Priya Das', assignedAt: daysAgo(3) },
      { volunteerUid: 'vol-009', volunteerName: 'Imran Hossain', assignedAt: daysAgo(3) },
      { volunteerUid: 'vol-010', volunteerName: 'Farhana Begum', assignedAt: daysAgo(2) }
    ],
    status: 'Filled',
    createdAt: daysAgo(10)
  },
  {
    _id: SLOT.vs16,
    postedBy: 'Cox\'s Bazar DMRO',
    postedByRole: 'Government',
    district: 'Cox\'s Bazar',
    taskType: 'Search & Rescue',
    volunteersNeeded: 12,
    description: 'Monsoon landslide and flash-flood response in Ukhiya and Teknaf upazilas.',
    assignedVolunteers: [],
    status: 'Closed',
    createdAt: daysAgo(14)
  }
];

const SEED_VOLUNTEER_APPLICATIONS = [
  // vs1 — Sunamganj Search & Rescue (4 applicants)
  { _id: 'va1', slotId: SLOT.vs1, volunteerUid: 'vol-011', volunteerName: 'Sabbir Rahman', volunteerDistrict: 'Sunamganj', message: 'Experienced boat operator, 5 years haor rescue work.', status: 'Accepted', respondedBy: 'BRAC Disaster Response', appliedAt: daysAgo(4), respondedAt: daysAgo(3) },
  { _id: 'va2', slotId: SLOT.vs1, volunteerUid: 'vol-012', volunteerName: 'Rokeya Khatun', volunteerDistrict: 'Sunamganj', message: 'Nursing background, can assist medical evacuations.', status: 'Pending', respondedBy: '', appliedAt: daysAgo(2), respondedAt: null },
  { _id: 'va3', slotId: SLOT.vs1, volunteerUid: 'vol-013', volunteerName: 'Jamal Uddin', volunteerDistrict: 'Sylhet', message: 'Available full-time this week.', status: 'Pending', respondedBy: '', appliedAt: daysAgo(1), respondedAt: null },
  { _id: 'va4', slotId: SLOT.vs1, volunteerUid: 'vol-014', volunteerName: 'Arif Hossain', volunteerDistrict: 'Mymensingh', message: 'Want to help.', status: 'Rejected', respondedBy: 'BRAC Disaster Response', appliedAt: daysAgo(3), respondedAt: daysAgo(2) },

  // vs2 — Sylhet Supply Distribution (5 applicants)
  { _id: 'va5', slotId: SLOT.vs2, volunteerUid: 'vol-015', volunteerName: 'Nasrin Akter', volunteerDistrict: 'Sylhet', message: 'Can work morning and evening shifts.', status: 'Pending', respondedBy: '', appliedAt: daysAgo(2), respondedAt: null },
  { _id: 'va6', slotId: SLOT.vs2, volunteerUid: 'vol-016', volunteerName: 'Biplob Das', volunteerDistrict: 'Sylhet', message: 'Warehouse experience at local NGO.', status: 'Pending', respondedBy: '', appliedAt: daysAgo(1), respondedAt: null },
  { _id: 'va7', slotId: SLOT.vs2, volunteerUid: 'vol-017', volunteerName: 'Mahmud Hasan', volunteerDistrict: 'Habiganj', message: 'Can drive pickup truck for supply runs.', status: 'Accepted', respondedBy: 'DMRO Sylhet', appliedAt: daysAgo(3), respondedAt: daysAgo(2) },
  { _id: 'va8', slotId: SLOT.vs2, volunteerUid: 'vol-018', volunteerName: 'Sadia Islam', volunteerDistrict: 'Sylhet', message: 'Student volunteer, flexible schedule.', status: 'Pending', respondedBy: '', appliedAt: hoursAgo(8), respondedAt: null },
  { _id: 'va9', slotId: SLOT.vs2, volunteerUid: 'vol-019', volunteerName: 'Kamal Uddin', volunteerDistrict: 'Sunamganj', message: 'Previously volunteered in 2024 floods.', status: 'Pending', respondedBy: '', appliedAt: hoursAgo(4), respondedAt: null },

  // vs3 — Kurigram Shelter Support (6 applicants)
  { _id: 'va10', slotId: SLOT.vs3, volunteerUid: 'vol-020', volunteerName: 'Firoza Begum', volunteerDistrict: 'Kurigram', message: 'Local resident, know all char villages.', status: 'Accepted', respondedBy: 'Friendship NGO', appliedAt: daysAgo(5), respondedAt: daysAgo(4) },
  { _id: 'va11', slotId: SLOT.vs3, volunteerUid: 'vol-021', volunteerName: 'Habibur Rahman', volunteerDistrict: 'Kurigram', message: 'Can translate for char-dweller families.', status: 'Pending', respondedBy: '', appliedAt: daysAgo(3), respondedAt: null },
  { _id: 'va12', slotId: SLOT.vs3, volunteerUid: 'vol-022', volunteerName: 'Anika Sultana', volunteerDistrict: 'Rangpur', message: 'Social work student from Begum Rokeya University.', status: 'Pending', respondedBy: '', appliedAt: daysAgo(2), respondedAt: null },
  { _id: 'va13', slotId: SLOT.vs3, volunteerUid: 'vol-023', volunteerName: 'Delwar Hossain', volunteerDistrict: 'Lalmonirhat', message: 'Available for 2 weeks.', status: 'Pending', respondedBy: '', appliedAt: daysAgo(1), respondedAt: null },
  { _id: 'va14', slotId: SLOT.vs3, volunteerUid: 'vol-024', volunteerName: 'Rubina Akter', volunteerDistrict: 'Gaibandha', message: 'Midwife — can help pregnant women at shelter.', status: 'Accepted', respondedBy: 'Friendship NGO', appliedAt: daysAgo(4), respondedAt: daysAgo(3) },
  { _id: 'va15', slotId: SLOT.vs3, volunteerUid: 'vol-025', volunteerName: 'Shahidul Alam', volunteerDistrict: 'Dhaka', message: 'Visiting family in Kurigram, want to contribute.', status: 'Rejected', respondedBy: 'Friendship NGO', appliedAt: daysAgo(3), respondedAt: daysAgo(2) },

  // vs4 — Feni Search & Rescue (5 applicants)
  { _id: 'va16', slotId: SLOT.vs4, volunteerUid: 'vol-026', volunteerName: 'Tareq Mahmud', volunteerDistrict: 'Feni', message: 'Swimming instructor, own rescue boat.', status: 'Pending', respondedBy: '', appliedAt: hoursAgo(20), respondedAt: null },
  { _id: 'va17', slotId: SLOT.vs4, volunteerUid: 'vol-027', volunteerName: 'Nazma Khatun', volunteerDistrict: 'Feni', message: 'Red Crescent trained first responder.', status: 'Pending', respondedBy: '', appliedAt: hoursAgo(16), respondedAt: null },
  { _id: 'va18', slotId: SLOT.vs4, volunteerUid: 'vol-028', volunteerName: 'Omar Faruk', volunteerDistrict: 'Comilla', message: 'Fire service volunteer, can join immediately.', status: 'Accepted', respondedBy: 'Feni District Admin', appliedAt: hoursAgo(22), respondedAt: hoursAgo(18) },
  { _id: 'va19', slotId: SLOT.vs4, volunteerUid: 'vol-029', volunteerName: 'Laboni Roy', volunteerDistrict: 'Noakhali', message: 'Experienced in 2024 Feni flash flood response.', status: 'Pending', respondedBy: '', appliedAt: hoursAgo(12), respondedAt: null },
  { _id: 'va20', slotId: SLOT.vs4, volunteerUid: 'vol-030', volunteerName: 'Hasan Mahmud', volunteerDistrict: 'Chittagong', message: 'Can bring own life jackets (x10).', status: 'Pending', respondedBy: '', appliedAt: hoursAgo(6), respondedAt: null },

  // vs5 — Gaibandha Medical Aid (3 applicants)
  { _id: 'va21', slotId: SLOT.vs5, volunteerUid: 'vol-031', volunteerName: 'Dr. Sumaiya Rahman', volunteerDistrict: 'Gaibandha', message: 'MBBS intern, can assist mobile clinic.', status: 'Accepted', respondedBy: 'Dhaka Community Aid', appliedAt: daysAgo(2), respondedAt: daysAgo(1) },
  { _id: 'va22', slotId: SLOT.vs5, volunteerUid: 'vol-032', volunteerName: 'Rashid Ahmed', volunteerDistrict: 'Bogura', message: 'Pharmacy student, can manage medicine inventory.', status: 'Pending', respondedBy: '', appliedAt: daysAgo(1), respondedAt: null },
  { _id: 'va23', slotId: SLOT.vs5, volunteerUid: 'vol-033', volunteerName: 'Mousumi Devi', volunteerDistrict: 'Gaibandha', message: 'Community health worker, 8 years experience.', status: 'Pending', respondedBy: '', appliedAt: hoursAgo(10), respondedAt: null },

  // vs8 — Jamalpur Supply (4 applicants)
  { _id: 'va24', slotId: SLOT.vs8, volunteerUid: 'vol-034', volunteerName: 'Alamgir Hossain', volunteerDistrict: 'Jamalpur', message: 'Can lift heavy sacks, available all day.', status: 'Accepted', respondedBy: 'Jamalpur DMRO', appliedAt: daysAgo(3), respondedAt: daysAgo(2) },
  { _id: 'va25', slotId: SLOT.vs8, volunteerUid: 'vol-035', volunteerName: 'Shirin Akter', volunteerDistrict: 'Jamalpur', message: 'Can manage family registration desk.', status: 'Pending', respondedBy: '', appliedAt: daysAgo(2), respondedAt: null },
  { _id: 'va26', slotId: SLOT.vs8, volunteerUid: 'vol-036', volunteerName: 'Monirul Islam', volunteerDistrict: 'Sherpur', message: 'Truck driver, can transport supplies.', status: 'Pending', respondedBy: '', appliedAt: daysAgo(1), respondedAt: null },
  { _id: 'va27', slotId: SLOT.vs8, volunteerUid: 'vol-037', volunteerName: 'Popy Begum', volunteerDistrict: 'Jamalpur', message: 'Cook for 50+ people at shelter kitchen.', status: 'Accepted', respondedBy: 'Jamalpur DMRO', appliedAt: daysAgo(2), respondedAt: daysAgo(1) },

  // vs9 — Khulna Shelter (4 applicants)
  { _id: 'va28', slotId: SLOT.vs9, volunteerUid: 'vol-038', volunteerName: 'Saiful Islam', volunteerDistrict: 'Khulna', message: 'Coastal community leader, know evacuation routes.', status: 'Pending', respondedBy: '', appliedAt: daysAgo(1), respondedAt: null },
  { _id: 'va29', slotId: SLOT.vs9, volunteerUid: 'vol-039', volunteerName: 'Ruma Akter', volunteerDistrict: 'Khulna', message: 'Can manage children and elderly at shelter.', status: 'Pending', respondedBy: '', appliedAt: hoursAgo(14), respondedAt: null },
  { _id: 'va30', slotId: SLOT.vs9, volunteerUid: 'vol-040', volunteerName: 'Jahangir Alam', volunteerDistrict: 'Bagerhat', message: 'Cyclone shelter warden experience.', status: 'Accepted', respondedBy: 'Coastal Resilience NGO', appliedAt: daysAgo(2), respondedAt: daysAgo(1) },
  { _id: 'va31', slotId: SLOT.vs9, volunteerUid: 'vol-041', volunteerName: 'Nargis Sultana', volunteerDistrict: 'Satkhira', message: 'Nurse from Satkhira Medical College.', status: 'Pending', respondedBy: '', appliedAt: hoursAgo(6), respondedAt: null },

  // vs10 — Chattogram Rescue (3 applicants)
  { _id: 'va32', slotId: SLOT.vs10, volunteerUid: 'vol-042', volunteerName: 'Imtiaz Ahmed', volunteerDistrict: 'Chittagong', message: 'Scuba diver, can assist deep water rescue.', status: 'Pending', respondedBy: '', appliedAt: hoursAgo(20), respondedAt: null },
  { _id: 'va33', slotId: SLOT.vs10, volunteerUid: 'vol-043', volunteerName: 'Farzana Hoque', volunteerDistrict: 'Chittagong', message: 'Urban search and rescue certified.', status: 'Accepted', respondedBy: 'Chattogram DMRO', appliedAt: hoursAgo(18), respondedAt: hoursAgo(14) },
  { _id: 'va34', slotId: SLOT.vs10, volunteerUid: 'vol-044', volunteerName: 'Rakib Hasan', volunteerDistrict: 'Chittagong', message: 'Available with own pickup for transport.', status: 'Pending', respondedBy: '', appliedAt: hoursAgo(8), respondedAt: null },

  // vs13 — Barishal Shelter (2 applicants)
  { _id: 'va35', slotId: SLOT.vs13, volunteerUid: 'vol-045', volunteerName: 'Helal Uddin', volunteerDistrict: 'Barishal', message: 'Local imam, can coordinate community trust.', status: 'Accepted', respondedBy: 'Barishal Coastal Watch', appliedAt: daysAgo(2), respondedAt: daysAgo(1) },
  { _id: 'va36', slotId: SLOT.vs13, volunteerUid: 'vol-046', volunteerName: 'Shampa Rani', volunteerDistrict: 'Barishal', message: 'Sanitation and hygiene awareness trainer.', status: 'Pending', respondedBy: '', appliedAt: daysAgo(1), respondedAt: null }
];

const SEED_SHELTERS = [
  // 3 Dedicated GOV Shelters
  { _id: 'sh1', name: 'Sylhet Govt College Shelter', lat: 24.8998, lon: 91.9012, capacity: 800, occupancy: 340, district: 'Sylhet', phone: '+8801711223344', status: 'Available', addedBy: 'System (GOV)', active: true, createdAt: daysAgo(30) },
  { _id: 'sh2', name: 'Sunamganj Govt High School Shelter', lat: 25.0712, lon: 91.3965, capacity: 600, occupancy: 420, district: 'Sunamganj', phone: '+8801711223345', status: 'Available', addedBy: 'System (GOV)', active: true, createdAt: daysAgo(30) },
  { _id: 'sh3', name: 'Moulvibazar Stadium Shelter', lat: 24.4843, lon: 91.7775, capacity: 750, occupancy: 310, district: 'Moulvibazar', phone: '+8801711223346', status: 'Available', addedBy: 'System (GOV)', active: true, createdAt: daysAgo(28) },

  // 3 Dedicated GOV Logistics Hubs
  { _id: 'hub-gov-1', name: '[GOV] Sylhet Divisional Depot [Hub]', lat: 24.8950, lon: 91.8700, capacity: 15000, occupancy: 0, district: 'Sylhet', phone: '+8801711330001', status: 'Available', addedBy: 'System (GOV)', active: true, createdAt: daysAgo(30) },
  { _id: 'hub-gov-2', name: '[GOV] Sunamganj Disaster Depot [Hub]', lat: 25.0658, lon: 91.4073, capacity: 12000, occupancy: 0, district: 'Sunamganj', phone: '+8801711330002', status: 'Available', addedBy: 'System (GOV)', active: true, createdAt: daysAgo(28) },
  { _id: 'hub-gov-3', name: '[GOV] Moulvibazar Emergency Hub [Hub]', lat: 24.4843, lon: 91.7775, capacity: 10000, occupancy: 0, district: 'Moulvibazar', phone: '+8801711330003', status: 'Available', addedBy: 'System (GOV)', active: true, createdAt: daysAgo(25) },

  // NGO Logistics Hubs for NGO operations
  { _id: 'hub-ngo-1', name: '[BRAC] Sylhet Relief Hub [Hub]', lat: 24.8950, lon: 91.8700, capacity: 12000, occupancy: 0, district: 'Sylhet', phone: '+8801711330004', status: 'Available', addedBy: 'System', active: true, createdAt: daysAgo(25) },
  { _id: 'hub-ngo-2', name: '[BRAC] Kurigram Central Warehouse [Hub]', lat: 25.8054, lon: 89.6361, capacity: 10000, occupancy: 0, district: 'Kurigram', phone: '+8801711330005', status: 'Available', addedBy: 'System', active: true, createdAt: daysAgo(25) },

  // Extra GOV demo shelters used in local walkthroughs
  { _id: 'sh4', name: 'test 1 Abdur Rouf', lat: 23.8, lon: 90.37, capacity: 500, occupancy: 0, district: 'Sylhet', phone: '+8801711223399', status: 'Available', addedBy: 'National Disaster Admin (Govt)', active: true, createdAt: daysAgo(1) },
  { _id: 'sh5', name: 'Habiganj Govt College Shelter', lat: 24.3773, lon: 91.4120, capacity: 550, occupancy: 180, district: 'Habiganj', phone: '+8801711223347', status: 'Available', addedBy: 'System (GOV)', active: true, createdAt: daysAgo(20) },
  { _id: 'sh6', name: 'Companiganj High School Shelter', lat: 25.0930, lon: 91.6820, capacity: 400, occupancy: 90, district: 'Sylhet', phone: '+8801711223348', status: 'Available', addedBy: 'System (GOV)', active: true, createdAt: daysAgo(18) }
];

const NGO_ID = 'test-ngo-01';
const NGO_NAME = 'BRAC Disaster Relief';

const SEED_CAMPAIGNS = [
  {
    campaignId: 'cmp-syl-01',
    name: 'Sylhet Haor Relief Camp',
    ngoId: NGO_ID,
    ngoName: NGO_NAME,
    district: 'Sylhet',
    lat: 24.8950,
    lon: 91.8700,
    capacity: 600,
    occupancy: 120,
    contactPhone: '+8801711223344',
    status: 'Active',
    inventory: { dryFood: 1200, waterBottles: 3000, medicalKits: 250, hygienePacks: 400, shelterKits: 150 }
  },
  {
    campaignId: 'cmp-sun-01',
    name: 'Sunamganj Haor Emergency Camp',
    ngoId: NGO_ID,
    ngoName: NGO_NAME,
    district: 'Sunamganj',
    lat: 25.0658,
    lon: 91.4072,
    capacity: 500,
    occupancy: 80,
    contactPhone: '+8801711223355',
    status: 'Active',
    inventory: { dryFood: 900, waterBottles: 2200, medicalKits: 180, hygienePacks: 260, shelterKits: 90 }
  },
  {
    campaignId: 'cmp-kur-01',
    name: 'Kurigram Char Relief Camp',
    ngoId: NGO_ID,
    ngoName: NGO_NAME,
    district: 'Kurigram',
    lat: 25.8074,
    lon: 89.6295,
    capacity: 450,
    occupancy: 70,
    contactPhone: '+8801711223366',
    status: 'Active',
    inventory: { dryFood: 700, waterBottles: 1800, medicalKits: 140, hygienePacks: 200, shelterKits: 80 }
  },
  {
    campaignId: 'cmp-hub-brac-syl',
    name: '[BRAC] Sylhet Relief Hub [Hub]',
    ngoId: NGO_ID,
    ngoName: NGO_NAME,
    district: 'Sylhet',
    lat: 24.8950,
    lon: 91.8700,
    capacity: 12000,
    occupancy: 0,
    contactPhone: '+8801711330004',
    status: 'Active',
    inventory: { dryFood: 8500, waterBottles: 15000, medicalKits: 2400, hygienePacks: 800, shelterKits: 650 }
  },
  {
    campaignId: 'cmp-hub-brac-kur',
    name: '[BRAC] Kurigram Central Warehouse [Hub]',
    ngoId: NGO_ID,
    ngoName: NGO_NAME,
    district: 'Kurigram',
    lat: 25.8054,
    lon: 89.6361,
    capacity: 10000,
    occupancy: 0,
    contactPhone: '+8801711330005',
    status: 'Active',
    inventory: { dryFood: 4800, waterBottles: 8000, medicalKits: 1300, hygienePacks: 500, shelterKits: 450 }
  }
];

module.exports = {
  SEED_VOLUNTEER_SLOTS,
  SEED_VOLUNTEER_APPLICATIONS,
  SEED_SHELTERS,
  SEED_CAMPAIGNS
};
