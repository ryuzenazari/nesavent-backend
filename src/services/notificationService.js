const User = require('../models/User');
const Notification = require('../models/Notification');
const { logger } = require('../utils/logger');
const { sendEmail, getFreeEventNotificationTemplate } = require('./emailService');

const createNotification = async (recipientId, type, title, message, data = {}) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      type,
      title,
      message,
      data
    });
    
    await notification.save();
    logger.info(`Notification created for user ${recipientId}: ${title}`);
    
    return notification;
  } catch (error) {
    logger.error(`Failed to create notification: ${error.message}`);
    return null;
  }
};

const notifyAdmins = async (message, data = {}) => {
  try {
    const admins = await User.find({
      role: 'admin'
    });
    if (!admins.length) {
      logger.warn('Tidak ada admin yang ditemukan untuk notifikasi');
      return;
    }
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'event_approval',
        `Event Gratis Baru: ${data.eventTitle}`,
        message,
        data
      );
      if (data.eventId && data.eventTitle) {
        const emailHtml = getFreeEventNotificationTemplate(admin.name, data);
        await sendEmail(admin.email, `[NesaVent] Event Gratis Baru: ${data.eventTitle}`, emailHtml);
      }
    }
  } catch (error) {
    logger.error(`Error sending admin notification: ${error.message}`);
  }
};

const notifyTicketPurchase = async (userId, ticketData) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    await createNotification(
      userId,
      'ticket_purchase',
      `Tiket Berhasil Dibeli: ${ticketData.eventTitle}`,
      `Anda telah berhasil membeli tiket untuk event ${ticketData.eventTitle}`,
      ticketData
    );
  } catch (error) {
    logger.error(`Error sending ticket purchase notification: ${error.message}`);
  }
};

const notifyPaymentConfirmation = async (userId, paymentData) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    await createNotification(
      userId,
      'payment_confirmation',
      `Pembayaran Berhasil: ${paymentData.eventTitle}`,
      `Pembayaran Anda untuk event ${paymentData.eventTitle} telah berhasil`,
      paymentData
    );
  } catch (error) {
    logger.error(`Error sending payment confirmation notification: ${error.message}`);
  }
};

const notifyTicketTransfer = async (fromUserId, toUserId, ticketData) => {
  try {
    await createNotification(
      fromUserId,
      'ticket_transfer',
      `Tiket Berhasil Ditransfer: ${ticketData.eventTitle}`,
      `Anda telah mentransfer tiket untuk event ${ticketData.eventTitle}`,
      ticketData
    );
    await createNotification(
      toUserId,
      'ticket_transfer',
      `Anda Menerima Tiket: ${ticketData.eventTitle}`,
      `Anda telah menerima tiket untuk event ${ticketData.eventTitle}`,
      ticketData
    );
  } catch (error) {
    logger.error(`Error sending ticket transfer notification: ${error.message}`);
  }
};

const notifyEventReminder = async (userId, eventData) => {
  try {
    await createNotification(
      userId,
      'event_reminder',
      `Pengingat Event: ${eventData.title}`,
      `Event ${eventData.title} akan berlangsung dalam 24 jam`,
      eventData
    );
  } catch (error) {
    logger.error(`Error sending event reminder notification: ${error.message}`);
  }
};

const getUserNotifications = async (userId, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Notification.countDocuments({ recipient: userId });
    
    return {
      notifications,
      total,
      page,
      limit
    };
  } catch (error) {
    logger.error(`Failed to get user notifications: ${error.message}`);
    return {
      notifications: [],
      total: 0,
      page,
      limit
    };
  }
};

const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    return notification;
  } catch (error) {
    logger.error(`Failed to mark notification as read: ${error.message}`);
    return null;
  }
};

const sendAlert = async (alertData) => {
  try {
    logger.warn(`ALERT: ${alertData.type} - ${alertData.message}`, alertData.metadata || {});
    return true;
  } catch (error) {
    logger.error(`Failed to send alert: ${error.message}`);
    return false;
  }
};

module.exports = {
  notifyAdmins,
  notifyTicketPurchase,
  notifyPaymentConfirmation,
  notifyTicketTransfer,
  notifyEventReminder,
  getUserNotifications,
  markNotificationAsRead,
  sendAlert
};
