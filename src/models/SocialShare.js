const mongoose = require('mongoose');

const socialShareSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    shareType: {
      type: String,
      enum: ['facebook', 'twitter', 'whatsapp', 'telegram', 'email', 'copy_link', 'instagram', 'other'],
      required: true
    },
    referralCode: {
      type: String
    },
    shortLinkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShortLink'
    },
    metadata: {
      userAgent: String,
      ipAddress: String,
      device: String,
      browser: String,
      os: String
    },
    clicks: {
      type: Number,
      default: 0
    },
    ticketsPurchased: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

socialShareSchema.index({ event: 1, shareType: 1 });
socialShareSchema.index({ user: 1, createdAt: -1 });
socialShareSchema.index({ referralCode: 1 });

const SocialShare = mongoose.model('SocialShare', socialShareSchema);

module.exports = SocialShare; 