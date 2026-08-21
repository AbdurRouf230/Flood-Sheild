const mongoose = require('mongoose');

const TransportMessageSchema = new mongoose.Schema({
  senderName: { type: String, required: true },
  senderRole: { type: String, required: true },
  text: { type: String, required: true },
  sentAt: { type: Date, default: Date.now }
});

const TransportSchema = new mongoose.Schema({
  allocationId: { type: String, default: '' },
  district: { type: String, required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  itemsSummary: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'In Transit', 'Delivered', 'Cancelled'], default: 'Pending' },
  assignedVolunteers: [{ volunteerUid: String, volunteerName: String, assignedAt: Date }],
  estimatedArrival: { type: Date },
  dispatchedAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date },
  addedBy: { type: String, required: true },
  addedByRole: { type: String, enum: ['NGO', 'Government'], required: true },
  destinationShelterId: { type: String, default: '' },
  representativeUid: { type: String, default: '' },
  receivedByUid: { type: String, default: '' },
  dispatchedByText: { type: String, default: '' },
  chat: [TransportMessageSchema],
  // New fields for restock + village request workflows
  transportType: { type: String, enum: ['Village', 'Restock'], default: 'Village' },
  loadStatus: { type: String, enum: ['Not Loaded', 'Loaded'], default: 'Not Loaded' },
  restockWarehouse: { type: String, default: '' },
  restockItemType: { type: String, default: '' },
  restockQuantity: { type: Number, default: 0 },
  assignedHub: { type: String, default: '' },
  requestId: { type: String, default: '' }
});

module.exports = mongoose.model('Transport', TransportSchema);
