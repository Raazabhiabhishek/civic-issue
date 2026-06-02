const express = require('express');
const router = express.Router();
const {
  getAnalytics,
  getAllReports,
  getUsers,
  getWorkers,
  toggleUser,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/analytics', getAnalytics);
router.get('/reports', getAllReports);
router.get('/users', getUsers);
router.get('/workers', getWorkers);
router.patch('/users/:id/toggle', toggleUser);

module.exports = router;
