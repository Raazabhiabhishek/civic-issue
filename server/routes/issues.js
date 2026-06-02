const express = require('express');
const router = express.Router();
const { getReport, updateStatus, getNearbyIssues } = require('../controllers/reportController');
const { protect, optionalAuth } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Alias routes for issue tracking semantics.
router.get('/nearby', optionalAuth, getNearbyIssues);
router.get('/:id', optionalAuth, getReport);
router.patch('/:id/status', protect, upload.single('afterImage'), updateStatus);

module.exports = router;
