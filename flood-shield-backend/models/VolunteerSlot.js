const mongoose = require('mongoose');

const VolunteerSlotSchema = new mongoose.Schema({
  postedBy: { type: String, required: true },       // name of NGO/Gov user
  postedByRole: { type: String, enum: ['NGO', 'Government'], required: true },
  district: { type: String, required: true },
  taskType: {
    type: String,
    enum: ['Supply Distribution', 'Shelter Support', 'Search & Rescue', 'Medical Aid', 'Data Collection', 'Transport Escort'],
    required: true
  },
  volunteersNeeded: { type: Number, required: true, min: 1 },
  description: { type: String, default: '' },
  assignedVolunteers: [{ volunteerUid: String, volunteerName: String, assignedAt: Date }],
  status: { type: String, enum: ['Open', 'Filled', 'Closed'], default: 'Open' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VolunteerSlot', VolunteerSlotSchema);
