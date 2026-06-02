const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Report = require('../models/Report');
const { protect } = require('../middleware/auth');

// GET /api/users/profile
router.get('/profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const reports = await Report.find({ author: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, user, reports });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/profile
router.patch('/profile', protect, async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
