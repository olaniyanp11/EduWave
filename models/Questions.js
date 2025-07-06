const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  options: {
    type: [String], // Array of strings
    validate: [arr => arr.length >= 2, 'At least two options required']
  },
  correctAnswerIndex: {
    type: Number, // Index in the options array
    required: true
  }
});

module.exports = mongoose.model('Question', questionSchema);
