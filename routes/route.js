const express = require('express');
const authRoutes = require('./auth');
const userRoute = require('./student');
const adminRoutes = require('./admin');
const authenticateToken = require('../middlewares/checkLog');
const requireRole = require('../middlewares/checkrole');
const getUser = require('../middlewares/getUser');
const router = express.Router();


router.use("/", authRoutes)
router.use("/admin",authenticateToken,getUser,requireRole('admin'), require("./admin"))
router.use("/instructor",authenticateToken,getUser,requireRole('instructor'),require("./instructor"))
router.use("/student",authenticateToken,getUser,requireRole('student'),require("./student"))



module.exports = router;