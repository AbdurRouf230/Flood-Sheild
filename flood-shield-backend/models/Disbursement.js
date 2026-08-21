const mongoose = require('mongoose');

const DisbursementSchema = new mongoose.Schema({
  ngoName: { type: String, required: true },
  ngoId: { type: String, default: '' },
  amount: { type: Number, required: true },
  district: { type: String, default: 'General' },
  notes: { type: String, default: '' },
  disbursedBy: { type: String, default: 'Government Admin' },
  status: { type: String, default: 'Disbursed' },
  disbursedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Disbursement', DisbursementSchema);
