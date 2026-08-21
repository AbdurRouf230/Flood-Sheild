const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  warehouseName: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  itemType: {
    type: String,
    required: true,
    enum: ['Food', 'Water', 'Medicine', 'Shelter Kits']
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  unit: {
    type: String,
    required: true,
    default: 'units'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Inventory', InventorySchema);
