const AdminNotification = require('../models/AdminNotification');

const createNotification = async (notificationData) => {
  try {
    const result = await AdminNotification.createNotification(notificationData);
    return result;
  } catch (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }
};

const getNotifications = async (filters = {}, page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit;
    
    const query = {};
    
    if (filters.type) {
      query.type = filters.type;
    }
    
    if (filters.priority) {
      query.priority = filters.priority;
    }
    
    if (filters.read !== undefined) {
      query.read = filters.read;
    }
    
    if (filters.actionRequired !== undefined) {
      query.actionRequired = filters.actionRequired;
    }
    
    if (filters.adminId) {
      query.readBy = { 
        $not: { 
          $elemMatch: { 
            adminId: filters.adminId 
          } 
        } 
      };
    }
    
    const totalCount = await AdminNotification.countDocuments(query);
    
    const notifications = await AdminNotification.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    return {
      notifications,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to get notifications: ${error.message}`);
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

const markAsRead = async (notificationId, adminId) => {
  try {
    const result = await AdminNotification.markAsRead(notificationId, adminId);
    return result;
  } catch (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
};

const markAllAsRead = async (adminId, filters = {}) => {
  try {
    const query = {
      readBy: { 
        $not: { 
          $elemMatch: { 
            adminId 
          } 
        } 
      }
    };
    
    if (filters.type) {
      query.type = filters.type;
    }
    
    if (filters.priority) {
      query.priority = filters.priority;
    }
    
    const notifications = await AdminNotification.find(query);
    
    const updatePromises = notifications.map(notification => 
      AdminNotification.markAsRead(notification._id, adminId)
    );
    
    await Promise.all(updatePromises);
    
    return { success: true, count: updatePromises.length };
  } catch (error) {
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }
};

const markActionTaken = async (notificationId, adminId, notes = '') => {
  try {
    const result = await AdminNotification.markActionTaken(notificationId, adminId, notes);
    return result;
  } catch (error) {
    throw new Error(`Failed to mark action taken: ${error.message}`);
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
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAsRead,
  markAllAsRead,
  markActionTaken,
  deleteNotification,
  getNotificationStats
}; 