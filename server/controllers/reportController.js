const Report = require('../models/Report');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const { hasCloudinaryConfig } = require('../config/cloudinary');

const ISSUE_STATUSES = ['Reported', 'Pending', 'Assigned', 'In Progress', 'Resolved', 'Verified'];
const ADMIN_UPDATABLE_STATUSES = ['Reported', 'Pending', 'Assigned', 'In Progress', 'Resolved'];
const LEGACY_STATUS_MAP = {
  Submitted: 'Reported',
  Rejected: 'Pending',
};

const normalizeStatus = (status = '') => LEGACY_STATUS_MAP[status] || status;

const emitStatusUpdate = (req, payload) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('statusUpdated', payload);
    if (payload.authorId) {
      io.to(`user:${payload.authorId}`).emit('statusUpdated', payload);
    }
  }
};

const createStatusNotifications = async ({ report, status }) => {
  const recipientIds = new Set();

  if (report?.author?._id) {
    recipientIds.add(report.author._id.toString());
  }

  (report?.upvotes || []).forEach((id) => {
    if (id) recipientIds.add(id.toString());
  });

  if (recipientIds.size === 0) return;

  const notifications = [];
  recipientIds.forEach((userId) => {
    const isAuthor = report?.author?._id?.toString() === userId;
    const message = isAuthor
      ? (status === 'Resolved'
          ? `Your issue \"${report.title}\" is marked as Resolved.`
          : `Your issue \"${report.title}\" is now ${status}.`)
      : (status === 'Resolved'
          ? `An issue you upvoted (\"${report.title}\") is now Resolved.`
          : `An issue you upvoted (\"${report.title}\") is now ${status}.`);

    notifications.push({
      userId,
      message,
      read: false,
    });
  });

  await Notification.insertMany(notifications, { ordered: false });
};

const buildHistoryEntry = ({ status, note, user, roleOverride, timestamp }) => ({
  status,
  note: note || '',
  updatedBy: user?._id,
  updatedByRole: roleOverride || (user?.role === 'admin' ? 'admin' : 'user'),
  updatedByName: user?.name || 'System',
  timestamp: timestamp || new Date(),
});

const CATEGORY_KEYWORDS = {
  'Road Damage': ['road', 'pothole', 'crack', 'pavement', 'asphalt', 'sidewalk', 'street damage', 'broken road'],
  'Street Light': ['light', 'lamp', 'dark', 'streetlight', 'pole', 'lighting', 'bulb'],
  'Garbage': ['garbage', 'trash', 'waste', 'litter', 'dump', 'rubbish', 'filth', 'dirty', 'smell'],
  'Water Supply': ['water', 'pipe', 'leak', 'flood', 'drain', 'supply', 'tap', 'plumbing'],
  'Sewage': ['sewer', 'sewage', 'drain', 'overflow', 'manhole', 'stink', 'blocked drain'],
  'Public Safety': ['crime', 'danger', 'unsafe', 'hazard', 'theft', 'violence', 'broken fence', 'graffiti'],
  'Park & Recreation': ['park', 'playground', 'bench', 'tree', 'garden', 'recreation', 'grass', 'field'],
  'Traffic': ['traffic', 'signal', 'sign', 'accident', 'speed', 'congestion', 'jam', 'intersection'],
};

const autoDetectCategory = (title, description) => {
  const text = `${title} ${description}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return category;
    }
  }
  return 'Other';
};

const bufferToDataUrl = (file) => {
  if (!file?.buffer) return '';
  const mimeType = file.mimetype || 'image/jpeg';
  return `data:${mimeType};base64,${file.buffer.toString('base64')}`;
};

// POST /api/reports
exports.createReport = async (req, res, next) => {
  try {
    const { title, description, latitude, longitude, address, category } = req.body;

    const detectedCategory = category || autoDetectCategory(title, description);

    const images = req.files
      ? req.files.map((f) => {
          if (hasCloudinaryConfig) {
            return { url: f.path, publicId: f.filename };
          }

          return {
            url: bufferToDataUrl(f),
            publicId: f.originalname || 'local-upload',
          };
        })
      : [];

    const report = await Report.create({
      title,
      description,
      category: detectedCategory,
      status: 'Reported',
      statusHistory: [
        buildHistoryEntry({
          status: 'Reported',
          note: 'Issue reported by citizen',
          user: req.user,
          roleOverride: 'user',
        }),
      ],
      images,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address: address || '',
      },
      author: req.user._id,
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { reportsCount: 1 } });

    await report.populate('author', 'name email avatar');

    res.status(201).json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

// GET /api/reports
exports.getReports = async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 20, lat, lng, radius, search } = req.query;

    const filter = {};
    if (status) filter.status = normalizeStatus(status);
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Geo filter (Atlas-safe for count + find)
    if (lat && lng && radius) {
      const radiusInKm = parseFloat(radius);
      const radiusInRadians = radiusInKm / 6378.1;
      filter.location = {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], radiusInRadians],
        },
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Report.countDocuments(filter);

    const reports = await Report.find(filter)
      .populate('author', 'name avatar')
      .populate('assignedTo', 'name email avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      reports,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/issues/nearby
exports.getNearbyIssues = async (req, res, next) => {
  try {
    const { lat, lng, radius = 500, limit = 5, excludeId } = req.query;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxDistance = Math.max(50, Math.min(5000, parseInt(radius, 10) || 500));
    const safeLimit = Math.max(1, Math.min(20, parseInt(limit, 10) || 5));

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ success: false, message: 'Valid lat and lng are required' });
    }

    const filter = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistance,
        },
      },
    };

    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      filter._id = { $ne: excludeId };
    }

    const reports = await Report.find(filter)
      .select('title status upvoteCount location category createdAt')
      .sort({ upvoteCount: -1, createdAt: -1 })
      .limit(safeLimit);

    res.json({ success: true, reports });
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/:id
exports.getReport = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const report = await Report.findById(req.params.id)
      .populate('author', 'name email avatar')
      .populate('assignedTo', 'name email avatar role')
      .populate('statusHistory.updatedBy', 'name email role avatar')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'name avatar role' },
        options: { sort: { createdAt: 1 } },
      });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const normalizedStatus = normalizeStatus(report.status);
    if (normalizedStatus !== report.status) {
      report.status = normalizedStatus;
      if (!report.statusHistory?.length) {
        report.statusHistory = [
          buildHistoryEntry({
            status: normalizedStatus,
            note: 'Migrated from legacy workflow status',
            roleOverride: 'system',
          }),
        ];
      }
      await report.save();
      await report.populate('statusHistory.updatedBy', 'name email role avatar');
    }

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

// POST /api/reports/:id/upvote
exports.upvoteReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const userId = req.user._id.toString();
    const alreadyUpvoted = report.upvotes.some((id) => id.toString() === userId);

    if (alreadyUpvoted) {
      report.upvotes = report.upvotes.filter((id) => id.toString() !== userId);
      report.upvoteCount = Math.max(0, report.upvoteCount - 1);
    } else {
      report.upvotes.push(req.user._id);
      report.upvoteCount += 1;
    }

    await report.save();

    res.json({
      success: true,
      upvoteCount: report.upvoteCount,
      upvoted: !alreadyUpvoted,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/reports/:id/comment
exports.addComment = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const comment = await Comment.create({
      text: req.body.text,
      author: req.user._id,
      report: report._id,
      isAdminComment: req.user.role === 'admin',
    });

    report.comments.push(comment._id);
    report.commentCount += 1;
    await report.save();

    await comment.populate('author', 'name avatar role');

    res.status(201).json({ success: true, comment });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/reports/:id/status (admin)
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, note, adminNotes } = req.body;
    let { assignedTo } = req.body;

    const requestedStatus = normalizeStatus(status);
    if (requestedStatus && !ISSUE_STATUSES.includes(requestedStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const report = await Report.findById(req.params.id)
      .populate('author', 'name email role avatar')
      .populate('assignedTo', 'name email role avatar');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const actorIsAdmin = req.user.role === 'admin';
    const actorIsAuthor = report.author?._id?.toString() === req.user._id.toString();
    const currentStatus = normalizeStatus(report.status);
    const statusBeforeUpdate = currentStatus;

    if (!actorIsAdmin) {
      const isVerificationFlow =
        currentStatus === 'Resolved' &&
        ['Verified', 'In Progress'].includes(requestedStatus);

      if (!actorIsAuthor || !isVerificationFlow) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update this status',
        });
      }

      if (assignedTo !== undefined || adminNotes !== undefined) {
        return res.status(403).json({
          success: false,
          message: 'Only admins can assign workers or update admin notes',
        });
      }
    }

    if (actorIsAdmin && requestedStatus && !ADMIN_UPDATABLE_STATUSES.includes(requestedStatus) && requestedStatus !== 'Verified') {
      return res.status(400).json({ success: false, message: 'Invalid status transition for admin' });
    }

    if (assignedTo !== undefined && assignedTo !== null && assignedTo !== '') {
      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        return res.status(400).json({ success: false, message: 'Invalid assignee user id' });
      }
      const worker = await User.findById(assignedTo);
      if (!worker) {
        return res.status(404).json({ success: false, message: 'Assignee user not found' });
      }
      assignedTo = worker._id;
    }

    if (requestedStatus) {
      report.status = requestedStatus;
    }
    if (adminNotes !== undefined) {
      report.adminNotes = adminNotes;
    }
    if (assignedTo !== undefined) {
      report.assignedTo = assignedTo || null;
    }

    if (req.file && actorIsAdmin) {
      if (hasCloudinaryConfig) {
        report.afterImage = {
          url: req.file.path,
          publicId: req.file.filename,
        };
      } else {
        const mimeType = req.file.mimetype || 'image/jpeg';
        report.afterImage = {
          url: `data:${mimeType};base64,${req.file.buffer.toString('base64')}`,
          publicId: req.file.originalname || 'local-after-image',
        };
      }
    }

    if (report.status === 'Resolved' && !report.resolvedAt) {
      report.resolvedAt = new Date();
    }
    if (report.status !== 'Resolved' && report.status !== 'Verified') {
      report.resolvedAt = undefined;
    }

    if (requestedStatus) {
      report.statusHistory.push(
        buildHistoryEntry({
          status: report.status,
          note,
          user: req.user,
        })
      );
    }

    // Keep assignment actions visible in the activity feed.
    if (!requestedStatus && assignedTo !== undefined) {
      report.statusHistory.push(
        buildHistoryEntry({
          status: report.status,
          note: note || (assignedTo ? 'Issue assigned to worker' : 'Worker assignment removed'),
          user: req.user,
          roleOverride: req.user.role === 'admin' ? 'admin' : 'user',
        })
      );
    }

    await report.save();
    await report.populate('author', 'name email avatar');
    await report.populate('assignedTo', 'name email avatar role');
    await report.populate('statusHistory.updatedBy', 'name email role avatar');

    if (requestedStatus && requestedStatus !== statusBeforeUpdate) {
      await createStatusNotifications({ report, status: requestedStatus });
      emitStatusUpdate(req, {
        issueId: report._id.toString(),
        status: requestedStatus,
        authorId: report.author?._id?.toString(),
      });
    }

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/reports/:id
exports.deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const isOwner = report.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Comment.deleteMany({ report: report._id });
    await report.deleteOne();
    await User.findByIdAndUpdate(report.author, { $inc: { reportsCount: -1 } });

    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    next(error);
  }
};
