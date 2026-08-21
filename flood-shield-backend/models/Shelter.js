const mongoose = require('mongoose');

const ShelterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  capacity: { type: Number, required: true, min: 1 },
  occupancy: { type: Number, default: 0 },
  district: { type: String, required: true },
  addedBy: { type: String, default: 'System' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Shelter', ShelterSchema);
