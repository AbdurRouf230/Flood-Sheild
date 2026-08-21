const mongoose = require('mongoose');

const ReliefRequestSchema = new mongoose.Schema({
  villageName: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  contactPerson: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  population: {
    type: Number,
    required: true
  },
  itemType: {
    type: String,
    required: true,
    enum: ['Food', 'Water', 'Medicine', 'Shelter Kits']
  },
  quantity: {
    type: Number,
    required: true
  },
  priorityScore: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Approved', 'Dispatched', 'Delivered'],
    default: 'Pending'
  },
  reportedAt: {
    type: Date,
    default: Date.now
  },
  submittedByUid: { type: String, default: '' },
  submittedByRole: { type: String, default: '' },
  destinationShelter: { type: String, default: '' },
  assignedHub: { type: String, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  shortestDistanceKm: { type: Number, default: null }
});

module.exports = mongoose.model('ReliefRequest', ReliefRequestSchema);
