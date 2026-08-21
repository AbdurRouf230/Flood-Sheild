const mongoose = require('mongoose');

const RepresentativeRequestSchema = new mongoose.Schema({
  requestType: {
    type: String,
    enum: ['ReliefLogistics', 'Funding', 'VillageRelief', 'StockAllocation'],
    required: true
  },
  submittedByUid: { type: String, required: true },
  submittedByName: { type: String, required: true },
  shelterId: { type: String, default: '' },
  shelterName: { type: String, required: true },
  district: { type: String, required: true },
  itemType: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  fundingAmount: { type: Number, default: 0 },
  approvedAmount: { type: Number, default: 0 },
  details: { type: String, default: '' },
  urgency: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'Approved', 'Declined', 'Rejected', 'Received', 'Fulfilled'], default: 'Pending' },
  govResponse: { type: String, default: '' },
  reliefRequestId: { type: String, default: '' },
  transportId: { type: String, default: '' },
  allocationId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  respondedAt: { type: Date },
  receivedAt: { type: Date }
});

module.exports = mongoose.model('RepresentativeRequest', RepresentativeRequestSchema);
