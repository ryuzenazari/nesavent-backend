const mongoose = require('mongoose');

const moderationCaseSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      required: true,
      enum: ['event', 'user', 'comment', 'review', 'payment']
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'contentType'
    },
    contentOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'removed'],
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    notes: {
      type: String
    },
    evidence: {
      type: [String]
    }
  },
  {
    timestamps: true
  }
);

// Index untuk mencari kasus berdasarkan status
moderationCaseSchema.index({ status: 1 });

// Index untuk mencari kasus berdasarkan tipe konten
moderationCaseSchema.index({ contentType: 1 });

// Index untuk mencari kasus berdasarkan prioritas
moderationCaseSchema.index({ priority: 1 });

// Index untuk mencari kasus berdasarkan pelapor
moderationCaseSchema.index({ reportedBy: 1 });

// Index untuk mencari kasus berdasarkan pemilik konten
moderationCaseSchema.index({ contentOwnerId: 1 });

const ModerationCase = mongoose.model('ModerationCase', moderationCaseSchema);

module.exports = ModerationCase; 