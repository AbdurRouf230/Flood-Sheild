const mongoose = require('mongoose');

const NGOAllocationSchema = new mongoose.Schema({
  ngoId: { type: String, default: '' },
  ngoName: { type: String, required: true },
  targetType: { type: String, enum: ['Campaign', 'Logistics'], required: true },
  targetId: { type: String, default: '' },
  targetName: { type: String, required: true },
  amount: { type: Number, required: true },
  notes: { type: String, default: '' },
  allocatedBy: { type: String, required: true },
  allocatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NGOAllocation', NGOAllocationSchema);
