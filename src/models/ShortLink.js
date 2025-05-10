const mongoose = require('mongoose');
const shortLinkSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    targetType: {
      type: String,
      required: true,
      enum: ['event', 'ticket', 'page', 'external'],
      default: 'event'
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: function () {
        return this.targetType !== 'external' && this.targetType !== 'page';
      },
      refPath: 'targetModel'
    },
    targetModel: {
      type: String,
      required: function () {
        return this.targetType !== 'external' && this.targetType !== 'page';
      },
      enum: ['Event', 'Ticket']
    },
    customUrl: {
      type: String,
      required: function () {
        return this.targetType === 'external' || this.targetType === 'page';
      },
      validate: {
        validator: function (v) {
          if (this.targetType === 'external') {
            return v.startsWith('http://') || v.startsWith('https://');
          }
          return true;
        },
        message: 'URL tidak valid. Harus dimulai dengan http:// atau https://'
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    visits: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);
module.exports = mongoose.model('ShortLink', shortLinkSchema);
