const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/auth');
const { detectIssueFromImage } = require('../controllers/detectController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/', protect, upload.single('image'), detectIssueFromImage);

module.exports = router;
