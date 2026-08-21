const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderUid: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, required: true },
  text: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const TeamMemberSchema = new mongoose.Schema({
  uid: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'Volunteer' },
  phone: { type: String, default: '' }
});

// Each dispatch entry (single volunteer OR rescue group) added to dispatches[]
const DispatchSchema = new mongoose.Schema({
  dispatchType: { type: String, enum: ['Single', 'Group'], default: 'Single' },
  // Single volunteer OR group leader
  volunteerUid: { type: String, default: '' },
  volunteerName: { type: String, default: '' },
  volunteerPhone: { type: String, default: '' },
  // Group-specific fields
  groupName: { type: String, default: '' },
  logoUrl: { type: String, default: '' },       // Team logo URL (shown on map for groups)
  teamMembers: [TeamMemberSchema],
  // Location: shelter location for groups, volunteer location for single
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  // Who dispatched (rep name/shelter/campaign)
  dispatchedBy: { type: String, default: '' },
  dispatchedByUid: { type: String, default: '' },
  dispatchedByRole: { type: String, default: '' },
  dispatchedAt: { type: Date, default: Date.now }
});

const SOSAlertSchema = new mongoose.Schema({
  citizenUid: { type: String, required: true },
  citizenName: { type: String, required: true },
  citizenPhone: { type: String, default: '' },
  citizenEmail: { type: String, default: '' },
  district: { type: String, default: 'Sylhet' },
  villageName: { type: String, default: '' },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  message: { type: String, default: 'Emergency SOS: Urgent Rescue Required!' },
  imageUrl: { type: String, default: '' },
  urgency: { type: String, enum: ['Critical', 'High', 'Moderate'], default: 'Critical' },
  status: { type: String, enum: ['Active SOS', 'Volunteer Dispatched', 'Resolved', 'Cancelled'], default: 'Active SOS' },

  // NEW: array of all dispatches (multiple volunteers + groups can respond to one SOS)
  dispatches: [DispatchSchema],

  // Legacy single-dispatch fields kept for backward compatibility
  dispatchType: { type: String, enum: ['Single', 'Group'], default: 'Single' },
  groupName: { type: String, default: '' },
  groupLeaderUid: { type: String, default: '' },
  groupLeaderName: { type: String, default: '' },
  groupLeaderPhone: { type: String, default: '' },
  teamMembers: [TeamMemberSchema],

  assignedVolunteerUid: { type: String, default: '' },
  assignedVolunteerName: { type: String, default: '' },
  assignedVolunteerPhone: { type: String, default: '' },
  volunteerLatitude: { type: Number, default: null },
  volunteerLongitude: { type: Number, default: null },
  
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SOSAlert', SOSAlertSchema);

