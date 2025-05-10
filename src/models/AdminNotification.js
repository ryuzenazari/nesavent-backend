const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['system', 'moderation', 'payment', 'user', 'event', 'report', 'promoCode', 'analytics', 'critical', 'other'],
    required: true
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
  read: {
    type: Boolean,
    default: false
  },
  readBy: [{
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  relatedTo: {
    model: {
      type: String,
      enum: ['User', 'Event', 'Ticket', 'Payment', 'ContentModeration', 'PromoCode', 'Report', null],
      default: null
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedTo.model',
      default: null
    }
  },
  actionRequired: {
    type: Boolean,
    default: false
  },
  actionTaken: {
    type: Boolean,
    default: false
  },
  actionTakenBy: {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    actionAt: Date,
    notes: String
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

adminNotificationSchema.index({ type: 1 });
adminNotificationSchema.index({ priority: 1 });
adminNotificationSchema.index({ read: 1 });
adminNotificationSchema.index({ 'readBy.adminId': 1 });
adminNotificationSchema.index({ actionRequired: 1 });
adminNotificationSchema.index({ createdAt: -1 });
adminNotificationSchema.index({ 'relatedTo.model': 1, 'relatedTo.id': 1 });

adminNotificationSchema.statics.createNotification = async function(notificationData) {
  try {
    const notification = new this(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }
};

adminNotificationSchema.statics.markAsRead = async function(notificationId, adminId) {
  try {
    const notification = await this.findById(notificationId);
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    const alreadyRead = notification.readBy.some(
      read => read.adminId.toString() === adminId.toString()
    );
    
    if (!alreadyRead) {
      notification.readBy.push({
        adminId,
        readAt: new Date()
      });
    }
    
    if (notification.readBy.length > 0) {
      notification.read = true;
    }
    
    await notification.save();
    return notification;
  } catch (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
};

adminNotificationSchema.statics.markActionTaken = async function(notificationId, adminId, notes = '') {
  try {
    const notification = await this.findById(notificationId);
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    notification.actionTaken = true;
    notification.actionTakenBy = {
      adminId,
      actionAt: new Date(),
      notes
    };
    
    await notification.save();
    return notification;
  } catch (error) {
    throw new Error(`Failed to mark action taken on notification: ${error.message}`);
  }
};

adminNotificationSchema.statics.getUnreadNotifications = async function(adminId, limit = 10) {
  try {
    const notifications = await this.find({
      readBy: { 
        $not: { 
          $elemMatch: { 
            adminId 
          } 
        } 
      }
    })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
    
    return notifications;
  } catch (error) {
    throw new Error(`Failed to get unread notifications: ${error.message}`);
  }
};

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);

module.exports = AdminNotification; 