const mongoose = require('mongoose');

const FundingRequestSchema = new mongoose.Schema({
  requestedByUid: { type: String, required: true },
  requestedByName: { type: String, required: true },
  requestedByRole: { type: String, default: '' },
  targetAdmin: { type: String, enum: ['Government', 'NGO'], required: true },
  amount: { type: Number, required: true },
  district: { type: String, default: 'General' },
  purpose: { type: String, default: '' },
  siteName: { type: String, default: '' },
  siteType: { type: String, default: 'Logistics' },
  orgName: { type: String, default: '' },
  ngoId: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Disbursed', 'Rejected'], default: 'Pending' },
  disbursedBy: { type: String, default: '' },
  disbursedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FundingRequest', FundingRequestSchema);
