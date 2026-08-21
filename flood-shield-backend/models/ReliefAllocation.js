const mongoose = require('mongoose');

const AllocationItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    required: true,
    enum: ['Food', 'Water', 'Medicine', 'Shelter Kits']
  },
  quantity: {
    type: Number,
    required: true
  }
});

const ReliefAllocationSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true // Prevents double allocation for the same request
  },
  warehouseName: {
    type: String,
    required: true
  },
  allocatedItems: {
    type: [AllocationItemSchema],
    required: true
  },
  routeDistance: {
    type: Number,
    required: true
  },
  routePath: {
    type: [String],
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['In Transit', 'Delivered'],
    default: 'In Transit'
  },
  dispatchedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

module.exports = mongoose.model('ReliefAllocation', ReliefAllocationSchema);
