const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getReport,
  upvoteReport,
  addComment,
  updateStatus,
  deleteReport,
} = require('../controllers/reportController');
const { protect, optionalAuth } = require('../middleware/auth');
const { validateReport, validateComment } = require('../middleware/validate');
const { upload } = require('../config/cloudinary');

router.get('/', optionalAuth, getReports);
router.get('/:id', optionalAuth, getReport);
router.post('/', protect, upload.array('images', 5), validateReport, createReport);
router.post('/:id/upvote', protect, upvoteReport);
router.post('/:id/comment', protect, validateComment, addComment);
router.patch('/:id/status', protect, upload.single('afterImage'), updateStatus);
router.delete('/:id', protect, deleteReport);

module.exports = router;
