const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
  donorName: { type: String, required: true },
  donorUid: { type: String, default: 'anonymous' },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'BDT' },
  message: { type: String, default: '' },
  district: { type: String, default: 'General' },
  donatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donation', DonationSchema);
