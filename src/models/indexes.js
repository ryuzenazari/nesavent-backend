const mongoose = require('mongoose');
const User = require('./User');
const Event = require('./Event');
const Ticket = require('./Ticket');
const Payment = require('./Payment');
const Rating = require('./Rating');
const Feedback = require('./Feedback');
const ModerationCase = require('./ModerationCase');
const PlatformReport = require('./PlatformReport');
const AdminNotification = require('./AdminNotification');

const createIndexes = async () => {
  try {
    // User indexes
    await User.collection.createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { role: 1 } }
    ]);

    // Event indexes
    await Event.collection.createIndexes([
      { key: { creator: 1 } },
      { key: { status: 1 } },
      { key: { category: 1 } },
      { key: { date: 1 } }
    ]);

    // Ticket indexes
    await Ticket.collection.createIndexes([
      { key: { event: 1 } },
      { key: { user: 1 } },
      { key: { ticketNumber: 1 }, unique: true }
    ]);

    // Payment indexes
    await Payment.collection.createIndexes([
      { key: { user: 1 } },
      { key: { ticket: 1 } },
      { key: { status: 1 } }
    ]);

    // Rating indexes
    await Rating.collection.createIndexes([
      { key: { event: 1, user: 1 }, unique: true },
      { key: { rating: 1 } }
    ]);

    // Feedback indexes
    await Feedback.collection.createIndexes([
      { key: { user: 1 } },
      { key: { type: 1 } },
      { key: { status: 1 } }
    ]);

    // ModerationCase indexes
    await ModerationCase.collection.createIndexes([
      { key: { status: 1 } },
      { key: { contentType: 1 } },
      { key: { priority: 1 } }
    ]);

    // PlatformReport indexes
    await PlatformReport.collection.createIndexes([
      { key: { reportType: 1 } },
      { key: { createdBy: 1 } },
      { key: { isPublished: 1 } }
    ]);

    // AdminNotification indexes
    await AdminNotification.collection.createIndexes([
      { key: { isRead: 1 } },
      { key: { priority: 1 } },
      { key: { type: 1 } }
    ]);

    console.log('Database indexes created successfully');
    return true;
  } catch (error) {
    console.error('Error creating database indexes:', error);
    return false;
  }
};

module.exports = { createIndexes }; 