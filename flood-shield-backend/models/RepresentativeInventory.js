const mongoose = require('mongoose');

const RepresentativeInventorySchema = new mongoose.Schema({
  representativeUid: { type: String, required: true, index: true },
  shelterName: { type: String, required: true },
  district: { type: String, required: true },
  itemType: {
    type: String,
    enum: ['Food', 'Water', 'Medicine', 'Shelter Kits'],
    required: true
  },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: 'units' },
  lastUpdated: { type: Date, default: Date.now }
});

RepresentativeInventorySchema.index({ representativeUid: 1, itemType: 1 }, { unique: true });

module.exports = mongoose.model('RepresentativeInventory', RepresentativeInventorySchema);
