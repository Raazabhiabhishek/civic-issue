const mongoose = require('mongoose');

const ISSUE_STATUSES = ['Reported', 'Pending', 'Assigned', 'In Progress', 'Resolved', 'Verified'];
const LEGACY_ISSUE_STATUSES = [...ISSUE_STATUSES, 'Submitted', 'Rejected'];

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: LEGACY_ISSUE_STATUSES,
      required: true,
    },
    note: {
      type: String,
      default: '',
      maxlength: [500, 'Status note cannot exceed 500 characters'],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedByRole: {
      type: String,
      enum: ['admin', 'worker', 'user', 'system'],
      default: 'system',
    },
    updatedByName: {
      type: String,
      default: 'System',
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      enum: [
        'Road Damage',
        'Street Light',
        'Garbage',
        'Water Supply',
        'Sewage',
        'Public Safety',
        'Park & Recreation',
        'Traffic',
        'Other',
      ],
      default: 'Other',
    },
    status: {
      type: String,
      enum: LEGACY_ISSUE_STATUSES,
      default: 'Reported',
    },
    statusHistory: [statusHistorySchema],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    afterImage: {
      url: {
        type: String,
        default: '',
      },
      publicId: {
        type: String,
        default: '',
      },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: {
        type: String,
        default: '',
      },
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    upvoteCount: {
      type: Number,
      default: 0,
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
    commentCount: {
      type: Number,
      default: 0,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

reportSchema.index({ location: '2dsphere' });
reportSchema.index({ status: 1 });
reportSchema.index({ category: 1 });
reportSchema.index({ author: 1 });
reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
