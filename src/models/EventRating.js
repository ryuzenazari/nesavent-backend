const mongoose = require('mongoose');

const eventRatingSchema = new mongoose.Schema(
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
      trim: true,
      maxlength: 1000
    },
    isAttended: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['active', 'deleted', 'flagged'],
      default: 'active'
    },
    likes: {
      count: {
        type: Number,
        default: 0
      },
      users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    },
    imageUrl: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

eventRatingSchema.index({ event: 1, user: 1 }, { unique: true });
eventRatingSchema.index({ event: 1, rating: -1 });
eventRatingSchema.index({ createdAt: -1 });

const EventRating = mongoose.model('EventRating', eventRatingSchema);

module.exports = EventRating; 