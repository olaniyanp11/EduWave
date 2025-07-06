// routes/instructor.js
const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const ActivityLog = require('../models/ActivityLog');
const path = require('path');
const multer = require('multer');
const fs = require("fs")

router.use('/uploads/videos', express.static(path.join(__dirname, 'uploads/videos')));


router.get('/dashboard', async (req, res) => {
  try {
    // grab instructor’s courses + their lessons & students
    const courses = await Course.find({ createdBy: req.user._id })
      .populate('lessons')
      .populate('students');

    // counts
    const courseCount = courses.length;
    const lessonCount = courses.reduce(
      (sum, c) => sum + (c.lessons?.length || 0),
      0
    );
    const enrollmentCount = courses.reduce(
      (sum, c) => sum + (c.students?.length || 0),
      0
    );

    // 5 most recent logs
    const recentActivities = await ActivityLog.find({ instructor: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    req.flash('success', `Welcome back ${req.user.name}`);
    res.render('protected/instructor/dashboard', {
      title:            'Instructor',
      user:             req.user,
      courses,
      courseCount,
      lessonCount,
      enrollmentCount,
      recentActivities
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error accessing dashboard');
    res.redirect('/login');
  }
});

router.get('/create-course',  (req, res) => {
  res.render('protected/instructor/create-course',{user: req.user, title:"Create Course"}); // render EJS form
});

// POST - Handle course creation
router.post('/create-course',  async (req, res) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).send('Access denied');
    }
    const user = req.user
    const { title, description } = req.body;

    const newCourse = new Course({
      title,
      description,
      createdBy: user._id
    });

    await newCourse.save();
    req.flash('succcess', `courses  created Successfully `)
    res.redirect('/instructor/courses');
  } catch (err) {
    console.error(err);
    req.flash('error', `error creating courses `)
    res.redirect('/instructor/dashboard')
  }
});

// GET - Instructor's Created Courses
router.get('/courses', async (req, res) => {
  try {
    const courses = await Course.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.render('protected/instructor/my-courses', { title: 'My Courses', courses, user:req.user });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to fetch courses');
    res.redirect('/instructor/dashboard');
  }
});
// GET - Edit Course Form
router.get('/courses/:id/edit', async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!course) {
      req.flash('error', 'Course not found');
      return res.redirect('/instructor/courses');
    }

    res.render('protected/instructor/edit-course', { course, title: 'Edit Course', user:req.user });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error fetching course');
    res.redirect('/instructor/courses');
  }
});
// POST - Update Course
router.post('/courses/:id/edit', async (req, res) => {
  try {
    const { title, description } = req.body;

    const updated = await Course.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { title, description },
      { new: true }
    );

    if (!updated) {
      req.flash('error', 'Course not found or unauthorized');
      return res.redirect('/instructor/courses');
    }

    req.flash('success', 'Course updated successfully');
    res.redirect('/instructor/courses');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update course');
    res.redirect('/instructor/courses');
  }
});
// POST - Delete Course
router.post('/courses/:id/delete', async (req, res) => {
  try {
    const result = await Course.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!result) {
      req.flash('error', 'Course not found or unauthorized');
    } else {
      req.flash('success', 'Course deleted successfully');
    }

    res.redirect('/instructor/courses');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error deleting course');
    res.redirect('/instructor/courses');
  }
});

const uploadVideo = require('../middlewares/uploadvideo');
const Quiz = require('../models/Quiz');
const Questions = require('../models/Questions');

// GET - Lesson Upload Form (same as before)
router.get('/courses/:id/lessons/upload', async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!course) {
    req.flash('error', 'Course not found');
    return res.redirect('/instructor/courses');
  }
  res.render('protected/instructor/upload-lesson', { title: 'Upload Lesson', course, user:req.user });
});
router.get('/courses/:id/lessons', async (req, res) => {
  try {
    const courseId = req.params.id;

    // Ensure the course belongs to the logged-in instructor
    const course = await Course.findOne({ _id: courseId, createdBy: req.user._id });

    if (!course) {
      req.flash('error', 'Course not found or unauthorized');
      return res.redirect('/instructor/courses');
    }

    const lessons = await Lesson.find({ course: courseId }).sort({ createdAt: -1 });

    res.render('protected/instructor/view-lessons', {
      title: 'Course Lessons',
      course,
      lessons,
      user:req.user
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading lessons');
    res.redirect('/instructor/courses');
  }
});
// POST - Handle Lesson Upload with video
router.post('/courses/:id/lessons/upload', uploadVideo.single('video'), async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!course) {
      req.flash('error', 'Unauthorized');
      return res.redirect('/instructor/courses');
    }

    const { title, content } = req.body;
    const video = req.file ? req.file.filename : null;

    const newLesson = new Lesson({
      course: course._id,
      title,
      content,
      video,
      uploadedBy: req.user._id
    });

    await newLesson.save();

    req.flash('success', 'Lesson uploaded successfully');
    res.redirect(`/instructor/courses/${course._id}/lessons`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Upload failed');
    res.redirect('/instructor/courses');
  }
});


// GET - Edit Lesson Form
router.get('/lessons/:id/edit', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('course');

    if (!lesson || lesson.uploadedBy.toString() !== req.user._id.toString()) {
      req.flash('error', 'Unauthorized or Lesson not found');
      return res.redirect('/instructor/courses');
    }

    res.render('protected/instructor/edit-lessons', {
      title: 'Edit Lesson',
      lesson,
      course: lesson.course,
      user:req.user
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load lesson for editing');
    res.redirect('/instructor/courses');
  }
});

router.post('/lessons/:id/delete', async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ _id: req.params.id, uploadedBy: req.user._id });

    if (!lesson) {
      req.flash('error', 'Lesson not found or unauthorized');
      return res.redirect('/instructor/courses');
    }

    // Delete video file if exists
    if (lesson.video) {
      const videoPath = path.join(__dirname, '../uploads/videos', lesson.video);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    await lesson.deleteOne();

    req.flash('success', 'Lesson deleted');
    res.redirect(`/instructor/courses/${lesson.course}/lessons`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete lesson');
    res.redirect('/instructor/courses');
  }
});

// POST - Update lesson (title, content, optional video)
router.post('/lessons/:id/edit', uploadVideo.single('video'), async (req, res) => {
  try {
    const { title, content } = req.body;
    const lessonId = req.params.id;

    // Find lesson (ensure it's owned by current user)
    const lesson = await Lesson.findOne({ _id: lessonId, uploadedBy: req.user._id });

    if (!lesson) {
      req.flash('error', 'Lesson not found or unauthorized');
      return res.redirect('/instructor/courses');
    }

    // Update basic fields
    lesson.title = title;
    lesson.content = content;

    // If a new video was uploaded
    if (req.file) {
      // Delete old video if exists
      if (lesson.video) {
        const oldPath = path.join(__dirname, '../uploads/videos', lesson.video);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Save new video filename
      lesson.video = req.file.filename;
    }

    await lesson.save();

    req.flash('success', 'Lesson updated successfully');
    return res.redirect(`/instructor/courses/${lesson.course}/lessons`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update lesson');
    res.redirect('/instructor/courses');
  }
});
router.get('/quiz-manager', async (req, res) => {
  try {
    const lessons = await Lesson.find({ uploadedBy: req.user._id })
      .populate('course')
      .lean();

    const quizMap = {};
    const quizzes = await Quiz.find({}).lean();
    quizzes.forEach(quiz => {
      quizMap[quiz.lesson.toString()] = quiz._id;
    });

    res.render('protected/instructor/quiz-manager', {
      lessons,
      quizMap, user:req.user,title:"Quiz Manager Page"
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Unable to load Quiz Manager');
    res.redirect('/instructor/courses');
  }
});

//  Quizzzzz sectionnnnnn
router.get('/lessons/:lessonId/quiz/create', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.lessonId);

    if (!lesson || lesson.uploadedBy.toString() !== req.user._id.toString()) {
      req.flash('error', 'Lesson not found or unauthorized');
      return res.redirect('/instructor/courses');
    }

    const quiz = await Quiz.findOne({ lesson: lesson._id });

    res.render('protected/instructor/create-quiz', {
      lesson,
      quiz,user:req.user,title:"Quiz Manager Page"
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load quiz form');
    res.redirect('/instructor/courses');
  }
});
router.post('/lessons/:lessonId/quiz/create', async (req, res) => {
  try {
    const { lessonId } = req.params;

    // Check if quiz already exists
    const existing = await Quiz.findOne({ lesson: lessonId });
    if (existing) {
      req.flash('info', 'Quiz already exists for this lesson');
      return res.redirect(`/instructor/lessons/${lessonId}/quiz/create`);
    }

    const newQuiz = await Quiz.create({
      lesson: lessonId,
      createdBy: req.user._id
    });

    req.flash('success', 'Quiz created. Now add questions.');
    res.redirect(`/instructor/lessons/${lessonId}/quiz/create`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to create quiz');
    res.redirect('/instructor/courses');
  }
});


router.post('/quiz/:quizId/questions', async (req, res) => {
  try {
    const { questionText, options, correctAnswerIndex } = req.body;

    await Questions.create({
      quiz: req.params.quizId,
      questionText,
      options: Array.isArray(options) ? options : [options],
      correctAnswerIndex
    });

    req.flash('success', 'Question added');
   res.redirect(req.get('referer'));

  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to add question');
   res.redirect(req.get('referer'));

  }
});
router.get('/quiz/:quizId/questions', async (req, res) => {
  const quizId = req.params.quizId;

  const quiz = await Quiz.findById(quizId).populate('lesson').lean();
  const questions = await Questions.find({ quiz: quizId }).lean();

  res.render('protected/instructor/view-question', {
    quiz,
    questions,
    user:req.user,title:"View Questions Page"
  });
});

// GET /instructor/questions/:id/edit
router.get('/questions/:id/edit', async (req, res) => {
  const question = await Questions.findById(req.params.id).lean();
  res.render('protected/instructor/edit-question', { question,user:req.user,title:"Edit Question Page" });
});
// POST /instructor/questions/:id/edit
router.post('/questions/:id/edit', async (req, res) => {
  const { questionText, options, correctAnswerIndex } = req.body;

  await Questions.findByIdAndUpdate(req.params.id, {
    questionText,
    options: Array.isArray(options) ? options : [options],
    correctAnswerIndex
  });

  req.flash('success', 'Question updated.');
 res.redirect(req.get('referer'));

});
// POST /instructor/questions/:id/delete
router.post('/questions/:id/delete', async (req, res) => {
  await Questions.findByIdAndDelete(req.params.id);
  req.flash('success', 'Question deleted.');
 res.redirect(req.get('referer'));

});



module.exports = router;
