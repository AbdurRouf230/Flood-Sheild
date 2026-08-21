const mongoose = require('mongoose');

const VolunteerApplicationSchema = new mongoose.Schema({
  slotId: { type: String, required: true },
  volunteerUid: { type: String, required: true },
  volunteerName: { type: String, required: true },
  volunteerDistrict: { type: String, required: true },
  message: { type: String, default: '' },
  cvUrl: { type: String, default: '' },
  nidNumber: { type: String, default: '' },
  nidImageUrl: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
  respondedBy: { type: String, default: '' },
  appliedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date }
});

module.exports = mongoose.model('VolunteerApplication', VolunteerApplicationSchema);
