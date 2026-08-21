const mongoose = require('mongoose');

const NGORequestSchema = new mongoose.Schema({
  ngoName: { type: String, required: true },
  ngoUid: { type: String, required: true },
  requestType: {
    type: String,
    enum: ['Supplies', 'Volunteers', 'Transport', 'Funding'],
    required: true
  },
  district: { type: String, required: true },
  itemDetail: { type: String, required: true },   // e.g. "500 food bags" or "10 volunteers"
  quantity: { type: Number, default: 1 },
  urgency: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  govResponse: { type: String, default: '' },
  respondedBy: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  respondedAt: { type: Date }
});

module.exports = mongoose.model('NGORequest', NGORequestSchema);
