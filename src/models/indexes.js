const mongoose = require('mongoose');
const Event = require('./Event');
const User = require('./User');
const Ticket = require('./Ticket');
const Payment = require('./Payment');
const Rating = require('./Rating');

const createIndexes = async () => {
  try {
    await Event.collection.createIndexes([
      { key: { title: 'text', description: 'text' } },
      { key: { creator: 1 } },
      { key: { status: 1 } },
      { key: { date: 1 } },
      { key: { 'location.city': 1 } },
      { key: { categories: 1 } },
      { key: { isPublished: 1, date: 1 } }
    ]);

    await User.collection.createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { username: 1 }, unique: true },
      { key: { role: 1 } },
      { key: { 'student.isVerified': 1 } }
    ]);

    await Ticket.collection.createIndexes([
      { key: { event: 1 } },
      { key: { user: 1 } },
      { key: { qrCode: 1 }, unique: true },
      { key: { status: 1 } },
      { key: { event: 1, ticketType: 1 } },
      { key: { isValidated: 1 } }
    ]);

    await Payment.collection.createIndexes([
      { key: { user: 1 } },
      { key: { ticket: 1 }, unique: true },
      { key: { status: 1 } },
      { key: { 'midtrans.orderId': 1 }, unique: true }
    ]);

    await Rating.collection.createIndexes([
      { key: { event: 1 } },
      { key: { user: 1 } },
      { key: { event: 1, user: 1 }, unique: true },
      { key: { rating: 1 } }
    ]);

    console.log('Database indexes created successfully');
    return true;
  } catch (error) {
    console.error('Error creating database indexes:', error);
    return false;
  }
};

module.exports = { createIndexes }; 