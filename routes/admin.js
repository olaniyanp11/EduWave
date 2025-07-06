// routes/admin.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Course = require("../models/Course");
const jwt= require("jsonwebtoken");
const Lesson = require("../models/Lesson");
const Comment = require("../models/Comment");
const Quiz = require("../models/Quiz");
const Questions = require("../models/Questions");



// Admin Dashboard
router.get('/dashboard',  async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalInstructors = await User.countDocuments({ role: 'instructor' });
    const totalCourses = await Course.countDocuments();

    res.render('protected/admin/dashboard', {
      user: req.user,
      title: "Admin Panel",
      stats: {
        totalUsers,
        totalStudents,
        totalInstructors,
        totalCourses
      }
    });
  } catch (err) {
    console.error('Admin Dashboard Error:', err);
    res.status(500).send('Server error');
  }
});

// Manage Users
router.get('/users',  async (req, res) => {
  const users = await User.find();
  res.render('protected/admin/users', { users, title: 'Manage Users', user: req.user });
});
/* ------------------------------------------------------------------
   DELETE USER  +  cascade‑cleanup
   ------------------------------------------------------------------ */
router.post('/users/:id/delete', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      req.flash('error', 'User not found.');
      return    res.redirect(req.get('referer'));
    }

    /* ----- if INSTRUCTOR: remove all their courses + sub‑docs -------- */
    if (user.role === 'instructor') {
      const courses = await Course.find({ createdBy: user._id });
      const courseIds = courses.map(c => c._id);

      // Delete lessons that belong to those courses
      const lessons = await Lesson.find({ course: { $in: courseIds } });
      const lessonIds = lessons.map(l => l._id);

      await Lesson.deleteMany({ course: { $in: courseIds } });
      await Course.deleteMany({ _id: { $in: courseIds } });

      // Delete quizzes & questions linked to those lessons
      const quizzes = await Quiz.find({ lesson: { $in: lessonIds } });
      const quizIds = quizzes.map(q => q._id);

      await Quiz.deleteMany({ lesson: { $in: lessonIds } });
      await Questions.deleteMany({ quiz: { $in: quizIds } });
    }

    /* ----- if STUDENT: pull from courses + wipe results ------------- */
    if (user.role === 'student') {
      await Course.updateMany(
        { students: user._id },
        { $pull: { students: user._id } }
      );
      await Result.deleteMany({ student: user._id });
    }

    /* ----- delete user comments (any role) -------------------------- */
    await Comment.deleteMany({ user: user._id });

    /* ----- finally delete the user ---------------------------------- */
    await user.deleteOne();

    req.flash('success', 'User and related data deleted.');
       res.redirect(req.get('referer'));
  } catch (err) {
    console.error('Admin delete user error:', err);
    req.flash('error', 'Failed to delete user.');
       res.redirect(req.get('referer'));
  }
});

/* ------------------------------------------------------------------
   DELETE COURSE (single click)
   ------------------------------------------------------------------ */
router.post('/courses/:id/delete', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      req.flash('error', 'Course not found.');
      return    res.redirect(req.get('referer'));
    }

    // Delete lessons, quizzes, questions tied to this course
    const lessons   = await Lesson.find({ course: course._id });
    const lessonIds = lessons.map(l => l._id);

    await Lesson.deleteMany({ course: course._id });

    const quizzes   = await Quiz.find({ lesson: { $in: lessonIds } });
    const quizIds   = quizzes.map(q => q._id);

    await Quiz.deleteMany({ lesson: { $in: lessonIds } });
    await Questions.deleteMany({ quiz: { $in: quizIds } });


    // Remove course from students’ enrolled array
    await Course.updateMany(
      { _id: course._id },
      { $set: { students: [] } }
    );

    await course.deleteOne();

    req.flash('success', 'Course deleted successfully.');
       res.redirect(req.get('referer'));
  } catch (err) {
    console.error('Admin delete course error:', err);
    req.flash('error', 'Failed to delete course.');
       res.redirect(req.get('referer'));
  }
});
// Manage Courses
router.get('/courses',  async (req, res) => {
  const courses = await Course.find().populate('createdBy', 'name');
  res.render('protected/admin/courses', { courses, title: 'Manage Courses', user: req.user });
});

router.post('/courses/:id',  async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Course deleted' });
});

module.exports = router;
