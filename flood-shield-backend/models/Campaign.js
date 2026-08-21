const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  campaignId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  ngoId: {
    type: String,
    required: true
  },
  ngoName: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  lat: {
    type: Number,
    required: true
  },
  lon: {
    type: Number,
    required: true
  },
  capacity: {
    type: Number,
    default: 500
  },
  occupancy: {
    type: Number,
    default: 0
  },
  contactPhone: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Active', 'Winding Down', 'Closed'],
    default: 'Active'
  },
  inventory: {
    dryFood: { type: Number, default: 1000 },
    waterBottles: { type: Number, default: 2000 },
    medicalKits: { type: Number, default: 150 },
    hygienePacks: { type: Number, default: 300 },
    shelterKits: { type: Number, default: 100 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Campaign', CampaignSchema);
