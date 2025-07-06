// models/Course.js
const mongoose    = require('mongoose');
const ActivityLog = require('./ActivityLog');

const courseSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    description: String,
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    students:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

// 🎩 Virtual so you can Course.populate('lessons')
courseSchema.virtual('lessons', {
  ref:          'Lesson',
  localField:   '_id',
  foreignField: 'course'
});

// capture isNew before save
courseSchema.pre('save', function (next) {
  this._wasNew = this.isNew;
  next();
});

courseSchema.post('save', async function (doc) {
  if (doc._wasNew) {
    await ActivityLog.create({
      instructor: doc.createdBy,
      action:     `Created course: "${doc.title}"`,
      meta:       { courseId: doc._id }
    });
  }
});

module.exports = mongoose.model('Course', courseSchema);
