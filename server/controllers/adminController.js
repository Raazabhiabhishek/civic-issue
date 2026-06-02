const Report = require('../models/Report');
const User = require('../models/User');
const Comment = require('../models/Comment');

// GET /api/admin/analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const [
      totalReports,
      reported,
      pending,
      assigned,
      inProgress,
      resolved,
      verified,
      totalUsers,
      recentReports,
      categoryBreakdown,
      monthlyTrend,
    ] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: { $in: ['Reported', 'Submitted'] } }),
      Report.countDocuments({ status: { $in: ['Pending', 'Rejected'] } }),
      Report.countDocuments({ status: 'Assigned' }),
      Report.countDocuments({ status: 'In Progress' }),
      Report.countDocuments({ status: 'Resolved' }),
      Report.countDocuments({ status: 'Verified' }),
      User.countDocuments({ role: 'user' }),
      Report.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('author', 'name avatar'),
      Report.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Report.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 6 },
      ]),
    ]);

    const resolutionRate = totalReports > 0
      ? Math.round(((resolved + verified) / totalReports) * 100)
      : 0;

    res.json({
      success: true,
      analytics: {
        totalReports,
        byStatus: { reported, pending, assigned, inProgress, resolved, verified },
        totalUsers,
        resolutionRate,
        recentReports,
        categoryBreakdown,
        monthlyTrend: monthlyTrend.reverse(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/reports
exports.getAllReports = async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Report.countDocuments(filter);

    const reports = await Report.find(filter)
      .populate('author', 'name email avatar')
      .populate('assignedTo', 'name email avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      reports,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/workers
exports.getWorkers = async (req, res, next) => {
  try {
    const workers = await User.find({
      role: 'user',
      isActive: true,
    })
      .select('name email avatar role')
      .sort({ name: 1 });

    res.json({ success: true, workers });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments();

    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      users,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/users/:id/toggle
exports.toggleUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate yourself' });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
