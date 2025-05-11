const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      maxlength: 500
    },
    isVerifiedAttendee: {
      type: Boolean,
      default: false
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    isReported: {
      type: Boolean,
      default: false
    },
    reportReason: String
  },
  {
    timestamps: true
  }
);

// Memastikan bahwa seorang user hanya bisa memberikan satu rating untuk satu event
ratingSchema.index({ event: 1, user: 1 }, { unique: true });

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating; 