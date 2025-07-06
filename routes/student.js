const express = require("express")
const Course = require("../models/Course")
const router = express.Router()
const Lesson = require('../models/Lesson');
const Comment = require('../models/Comment');
const Questions = require("../models/Questions")

router.get('/dashboard',  async (req, res) => {
  try {
    const courses = await Course.find({ students: req.user._id })
      .populate('createdBy', 'name') // Use 'createdBy' instead of 'instructor'
      .lean();

    // Optionally populate lessons if you want lesson count
    const lessons = await Lesson.find({ course: { $in: courses.map(c => c._id) } });

    // Attach lesson count and instructor info to each course
    const courseData = courses.map(course => {
      const lessonCount = lessons.filter(l => l.course.toString() === course._id.toString()).length;
      return {
        ...course,
        lessons: Array(lessonCount).fill({}), // just for counting in EJS
        instructor: course.createdBy
      };
    });

    res.render('protected/student/dashboard', {
      user: req.user,
      title: 'Dashboard',
      courses: courseData
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).send('Server Error');
  }
});

// GET /student/explore
router.get('/explore', async (req, res) => {
  const allCourses = await Course.find().populate('createdBy', 'name');
  const enrolled = await Course.find({ students: req.user._id }).select('_id');
  const enrolledIds = enrolled.map(c => c._id.toString());

  res.render('protected/student/explore', {
    user: req.user,
    courses: allCourses,
    enrolledIds,
    title: "Explore Courses"
  });
});
// POST /student/enroll/:courseId
router.post('/enroll/:courseId', async (req, res) => {
  const course = await Course.findById(req.params.courseId);

  if (!course.students) course.students = []; // <-- safeguard

  if (!course.students.includes(req.user._id)) {
    course.students.push(req.user._id);
    await course.save();
  }

  req.flash('success', 'Enrolled successfully!');
  res.redirect('/student/dashboard');
});


// GET /student/courses/:id/lessons
router.get('/courses/:id/lessons', async (req, res) => {
  const course = await Course.findById(req.params.id);
  const lessons = await Lesson.find({ course: course._id });

  res.render('protected/student/lessons', {
    user: req.user,
    course,
    lessons,
    title: `Lessons - ${course.title}`
  });
});
// GET /student/lessons/:id
router.get('/lessons/:id', async (req, res) => {
  const lesson = await Lesson.findById(req.params.id).populate('course');
  const quiz = await Quiz.findOne({ lesson: lesson._id });
  const comments = await Comment.find({ lesson: lesson._id }).populate('user').sort({ postedAt: -1 });


  res.render('protected/student/lesson-view', {
    user: req.user,
    comments,
    lesson,
    quizAvailable: !!quiz,
    title: lesson.title
  });
});
const Quiz = require('../models/Quiz');

// GET /student/lessons/:id/quiz
router.get('/lessons/:id/quiz', async (req, res) => {
  const quiz = await Quiz.findOne({ lesson: req.params.id });

  if (!quiz) {
    req.flash('error_msg', 'No quiz found for this lesson.');
    return res.redirect('/student/dashboard');
  }

  const questions = await Questions.find({ quiz: quiz._id });

  res.render('protected/student/take-quiz', {
    user: req.user,
    quiz,
    questions, // <-- pass to EJS
    title: "Take Quiz"
  });
});
const Result = require('../models/Result');

// POST /student/lessons/:id/quiz
// POST: Handle quiz submission
router.post('/lessons/:id/quiz', async (req, res) => {
  const quiz = await Quiz.findOne({ lesson: req.params.id });
  const questions = await Questions.find({ quiz: quiz._id });

  let score = 0;

  questions.forEach((q, index) => {
    const selected = parseInt(req.body[`q${index}`], 10);
    if (selected === q.correctAnswerIndex) {
      score++;
    }
  });

  const totalQuestions = questions.length;
  const percentage = ((score / totalQuestions) * 100).toFixed(2);

  await Result.create({
    student: req.user._id,
    lesson: req.params.id,
    score,
    totalQuestions,
    percentage
  });

  req.flash('success', `Quiz submitted! You scored ${score}/${totalQuestions} (${percentage}%)`);
  res.redirect('/student/dashboard');
});
router.get('/scores', async (req, res) => {
  const results = await Result.find({ student: req.user._id }).populate('lesson');
  res.render('protected/student/scores', {
    user: req.user,
    results,
    title: "Quiz Scores"
  });
});

router.get('/courses', async (req, res) => {
  try {
    const courses = await Course.find({ students: req.user._id }).populate('createdBy');
    res.render('protected/student/my-courses', {
      title: "My Courses",
      courses,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load courses.");
    res.redirect('/student/dashboard');
  }
});

// POST /student/lessons/:id/comment
router.post('/lessons/:id/comment', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message.trim()) throw new Error("Comment cannot be empty.");

    await Comment.create({
      lesson: req.params.id,
      user: req.user._id,
      message
    });

    req.flash("success", "Comment added successfully");
    res.redirect(`/student/lessons/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to add comment");
    res.redirect(`/student/lessons/${req.params.id}`);
  }
});

module.exports = router 