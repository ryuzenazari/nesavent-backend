const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['event_approval', 'content_report', 'system_alert', 'verification_request', 'payment_issue', 'user_report']
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    },
    actionRequired: {
      type: Boolean,
      default: false
    },
    actionTaken: {
      type: Boolean,
      default: false
    },
    actionTakenAt: {
      type: Date
    },
    actionDetails: {
      type: mongoose.Schema.Types.Mixed
    },
    relatedTo: {
      model: {
        type: String,
        enum: ['Event', 'User', 'Transaction', 'CreatorVerification', 'ModerationCase', 'Payment']
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'relatedTo.model'
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Index untuk mencari notifikasi berdasarkan status dibaca
adminNotificationSchema.index({ isRead: 1 });

// Index untuk mencari notifikasi berdasarkan prioritas
adminNotificationSchema.index({ priority: 1 });

// Index untuk mencari notifikasi berdasarkan tipe
adminNotificationSchema.index({ type: 1 });

// Index untuk mencari notifikasi berdasarkan tindakan yang diperlukan
adminNotificationSchema.index({ actionRequired: 1 });

// Index untuk mencari notifikasi berdasarkan model yang terkait
adminNotificationSchema.index({ 'relatedTo.model': 1, 'relatedTo.id': 1 });

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);

module.exports = AdminNotification; 