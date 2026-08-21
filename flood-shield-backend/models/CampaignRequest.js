const mongoose = require('mongoose');

const CampaignRequestSchema = new mongoose.Schema({
  campaignId: {
    type: String,
    required: true
  },
  campaignName: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  ngoId: {
    type: String,
    required: true
  },
  representativeId: {
    type: String,
    required: true
  },
  representativeName: {
    type: String,
    required: true
  },
  itemsNeeded: {
    type: String,
    required: true
  },
  urgency: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Funded', 'Rejected'],
    default: 'Pending'
  },
  fundingAmount: {
    type: Number,
    default: 0
  },
  responseNote: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CampaignRequest', CampaignRequestSchema);
