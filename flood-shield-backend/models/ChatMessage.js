const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: ['en', 'bn', 'sylheti', 'chittagonian'],
    default: 'en'
  },
  outputType: {
    type: String,
    enum: ['explanation', 'safety', 'shelter'],
    default: 'explanation'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
