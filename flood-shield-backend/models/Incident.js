const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Flooded Road', 'Dam Breach', 'Trapped People', 'Shelter Need', 'Food Need']
  },
  desc: {
    type: String,
    required: true
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  image: {
    type: String // base64 representation of image
  },
  video: {
    type: String // base64 representation of video
  },
  severity: {
    type: String,
    enum: ['Low', 'Moderate', 'High', 'Critical'],
    default: 'Low'
  },
  status: {
    type: String,
    enum: ['Pending', 'Verified', 'Approved'],
    default: 'Pending'
  },
  reportedBy: {
    type: String, // User's name or email
    required: true
  },
  verifiedBy: {
    type: String // Volunteer's name
  },
  approvedBy: {
    type: String // Government official's name
  },
  aiTags: {
    type: [String],
    default: []
  },
  reportedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Incident', IncidentSchema);
