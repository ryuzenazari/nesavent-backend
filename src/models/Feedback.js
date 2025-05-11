const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['bug', 'feature_request', 'complaint', 'praise', 'question', 'other'],
      required: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'rejected'],
      default: 'pending'
    },
    reply: {
      type: String
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedAt: {
      type: Date
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    repliedAt: {
      type: Date
    },
    attachments: [String]
  },
  {
    timestamps: true
  }
);

// Index untuk mencari berdasarkan type
feedbackSchema.index({ type: 1 });

// Index untuk mencari berdasarkan status
feedbackSchema.index({ status: 1 });

// Index untuk mencari berdasarkan user
feedbackSchema.index({ user: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback; 