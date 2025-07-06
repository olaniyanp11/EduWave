// models/Lesson.js
const mongoose   = require('mongoose');
const ActivityLog = require('./ActivityLog');

const lessonSchema = new mongoose.Schema(
  {
    course:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    title:      { type: String, required: true },
    content:    String,
    video:      String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }          // gives you createdAt & updatedAt automatically
);

// capture isNew before save
lessonSchema.pre('save', function (next) {
  this._wasNew = this.isNew;
  next();
});

lessonSchema.post('save', async function (doc) {
  if (doc._wasNew) {
    await ActivityLog.create({
      instructor: doc.uploadedBy,
      action:     `Uploaded lesson: "${doc.title}"`,
      meta:       { lessonId: doc._id, course: doc.course }
    });
  }
});

module.exports = mongoose.model('Lesson', lessonSchema);
