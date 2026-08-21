const mongoose = require('mongoose');

const NGOInviteSchema = new mongoose.Schema({
  inviteId: {
    type: String,
    required: true,
    unique: true
  },
  ngoId: {
    type: String,
    required: true
  },
  ngoName: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: ''
  },
  campaignId: {
    type: String,
    default: ''
  },
  campaignName: {
    type: String,
    default: ''
  },
  assignedHub: {
    type: String,
    default: ''
  },
  district: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Registered'],
    default: 'Pending'
  },
  registeredUid: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('NGOInvite', NGOInviteSchema);
