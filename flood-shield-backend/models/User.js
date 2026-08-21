const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    required: true,
    enum: ['Government', 'NGO', 'Volunteer', 'Citizen', 'GovRepresentative', 'NGORepresentative'],
    default: 'Citizen'
  },
  district: {
    type: String,
    required: true,
    default: 'Dhaka'
  },
  allocatedArea: { type: String, default: '' },
  orgName: { type: String, default: '' },
  representativeId: { type: String, default: '' },
  shelterId: { type: String, default: '' },
  shelterName: { type: String, default: '' },
  campaignId: { type: String, default: '' },
  campaignName: { type: String, default: '' },
  assignedHub: { type: String, default: '' },
  ngoId: { type: String, default: '' },
  ngoInviteId: { type: String, default: '' },
  assignedTask: { type: String, default: '' },
  phone: { type: String, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
