const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');
const authenticateToken = require('../middlewares/checkLog');
const getUser = require('../middlewares/getUser');
const dotenv = require('dotenv').config()



// Pages
router.get('/',getUser, (req, res) => {
    res.render('index', { title: 'Home', user: req.user || null });
});

router.get('/register',getUser, (req, res) => {
    res.render('register', { title: 'Register', user: req.user || null });
});
router.get('/register/instructor',getUser, (req, res) => {
    res.render('register-instructor', { title: 'Register', user: req.user || null });
});

router.get('/login',getUser, (req, res) => {
    res.render('login', { title: 'Login', user: req.user || null });
});

router.post('/register/instructor', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render('auth/register-instructor', { error_msg: 'Passwords do not match' });
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.render('auth/register-instructor', { error_msg: 'Email already registered' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    role: 'instructor'
  });

  await newUser.save();
  req.flash('success_msg', 'Instructor account created. Please login.');
  res.redirect('/login');
});
// POST /register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'Email already exists.');
            return res.redirect('/register');
        }

        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters long.');
            return res.redirect('/register');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        req.flash('success', 'Account created successfully. Please login.');
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while registering.');
        res.redirect('/register');
    }
});

// POST /login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const token = jsonwebtoken.sign({ userId: user._id }, 'your_jwt_secret', { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });

        req.flash('success', 'Welcome back!');
       if(user.role === "student"){
         return res.redirect('/student/dashboard');
       }
       else if(user.role === "instructor"){
         return res.redirect('/instructor/dashboard');
       }
       else if(user.role === "admin"){
         return res.redirect('/admin/dashboard');
       }
       else{
        req.flash('error', 'Unauthorized Usser');
         return res.redirect('/logout');

       }
      
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while logging in.');
        res.redirect('/login');
    }
});

// GET /dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/login');
        }

        res.render('protected/dashboard', {
            title: 'Dashboard',
            user
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong.');
        res.redirect('/login');
    }
});

// GET /logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    req.flash('success', 'You have logged out.');
    res.redirect('/login');
});

module.exports = router;
