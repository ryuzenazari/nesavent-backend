const mongoose = require('mongoose');

const eventFeedbackSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    feedbackType: {
      type: String,
      enum: ['suggestion', 'complaint', 'appreciation', 'question', 'other'],
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    category: {
      type: String,
      enum: ['venue', 'organization', 'content', 'speakers', 'facilities', 'pricing', 'other'],
      default: 'other'
    },
    status: {
      type: String,
      enum: ['pending', 'read', 'responded', 'closed'],
      default: 'pending'
    },
    response: {
      content: String,
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      respondedAt: Date
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    isAnonymous: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

eventFeedbackSchema.index({ event: 1, createdAt: -1 });
eventFeedbackSchema.index({ user: 1, createdAt: -1 });
eventFeedbackSchema.index({ status: 1 });

const EventFeedback = mongoose.model('EventFeedback', eventFeedbackSchema);

module.exports = EventFeedback; 