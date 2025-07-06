// models/ActivityLog.js
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:     { type: String, required: true },
  meta:       { type: Object },
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
