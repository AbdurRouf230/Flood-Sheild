const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  leaderUid: { type: String, required: true },
  memberUids: [{ type: String }],
  createdBy: { type: String, required: true }, // Rep UID who created the team
  logoUrl: { type: String, default: '' }, // URL to team logo image
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', GroupSchema);
