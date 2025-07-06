const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  postedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);
