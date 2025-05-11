const AdminNotification = require('../models/AdminNotification');
const logger = require('../utils/logger');

/**
 * Mendapatkan semua notifikasi admin
 */
const getNotifications = async (filter = {}, options = {}) => {
  try {
    const notifications = await AdminNotification.find(filter)
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50);
    
    return notifications;
  } catch (error) {
    logger.error('Error getting admin notifications:', error);
    throw error;
  }
};

/**
 * Menambahkan notifikasi baru untuk admin
 */
const createNotification = async (notificationData) => {
  try {
    const notification = new AdminNotification(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    logger.error('Error creating admin notification:', error);
    throw error;
  }
};

/**
 * Menandai notifikasi sebagai telah dibaca
 */
const markAsRead = async (notificationId) => {
  try {
    const notification = await AdminNotification.findByIdAndUpdate(
      notificationId,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  } catch (error) {
    logger.error(`Error marking notification ${notificationId} as read:`, error);
    throw error;
  }
};

/**
 * Menandai semua notifikasi sebagai telah dibaca
 */
const markAllAsRead = async (filter = {}) => {
  try {
    const result = await AdminNotification.updateMany(
      { ...filter, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    return result;
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Menandai notifikasi telah ditindaklanjuti
 */
const markActionTaken = async (notificationId, actionData) => {
  try {
    const notification = await AdminNotification.findByIdAndUpdate(
      notificationId,
      { 
        actionTaken: true, 
        actionTakenAt: new Date(),
        actionDetails: actionData
      },
      { new: true }
    );
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  } catch (error) {
    logger.error(`Error marking action taken for notification ${notificationId}:`, error);
    throw error;
  }
};

const getUnreadNotificationCount = async (adminId) => {
  try {
    const count = await AdminNotification.countDocuments({
      readBy: { 
        $not: { 
          $elemMatch: { 
            adminId 
          } 
        } 
      }
    });
    
    const criticalCount = await AdminNotification.countDocuments({
      priority: 'critical',
      readBy: { 
        $not: { 
          $elemMatch: { 
            adminId 
          } 
        } 
      }
    });
    
    const actionRequiredCount = await AdminNotification.countDocuments({
      actionRequired: true,
      actionTaken: false,
      readBy: { 
        $not: { 
          $elemMatch: { 
            adminId 
          } 
        } 
      }
    });
    
    return {
      total: count,
      critical: criticalCount,
      actionRequired: actionRequiredCount
    };
  } catch (error) {
    throw new Error(`Failed to get unread notification count: ${error.message}`);
  }
};

const deleteNotification = async (notificationId) => {
  try {
    const result = await AdminNotification.findByIdAndDelete(notificationId);
    
    if (!result) {
      throw new Error('Notification not found');
    }
    
    return { success: true, message: 'Notification deleted successfully' };
  } catch (error) {
    throw new Error(`Failed to delete notification: ${error.message}`);
  }
};

const getNotificationStats = async () => {
  try {
    const stats = await AdminNotification.aggregate([
      {
        $facet: {
          byType: [
            { $group: { _id: "$type", count: { $sum: 1 } } }
          ],
          byPriority: [
            { $group: { _id: "$priority", count: { $sum: 1 } } }
          ],
          byActionRequired: [
            { $group: { _id: "$actionRequired", count: { $sum: 1 } } }
          ],
          byActionTaken: [
            { $group: { _id: "$actionTaken", count: { $sum: 1 } } }
          ],
          byRead: [
            { $group: { _id: "$read", count: { $sum: 1 } } }
          ],
          total: [
            { $count: "count" }
          ]
        }
      }
    ]);
    
    const formattedStats = {
      byType: {},
      byPriority: {},
      byActionRequired: {},
      byActionTaken: {},
      byRead: {},
      total: stats[0].total[0]?.count || 0
    };
    
    stats[0].byType.forEach(item => {
      formattedStats.byType[item._id] = item.count;
    });
    
    stats[0].byPriority.forEach(item => {
      formattedStats.byPriority[item._id] = item.count;
    });
    
    stats[0].byActionRequired.forEach(item => {
      formattedStats.byActionRequired[item._id] = item.count;
    });
    
    stats[0].byActionTaken.forEach(item => {
      formattedStats.byActionTaken[item._id] = item.count;
    });
    
    stats[0].byRead.forEach(item => {
      formattedStats.byRead[item._id] = item.count;
    });
    
    return formattedStats;
  } catch (error) {
    throw new Error(`Failed to get notification stats: ${error.message}`);
  }
};

module.exports = {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  markActionTaken,
  getUnreadNotificationCount,
  deleteNotification,
  getNotificationStats
}; 