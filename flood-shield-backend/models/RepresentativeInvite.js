const mongoose = require('mongoose');

const RepresentativeInviteSchema = new mongoose.Schema({
  inviteId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  shelterId: { type: String, default: '' },
  shelterName: { type: String, default: '' },
  assignedHub: { type: String, default: '' },
  district: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Registered'], default: 'Pending' },
  registeredUid: { type: String, default: '' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RepresentativeInvite', RepresentativeInviteSchema);
