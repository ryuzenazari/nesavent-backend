const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const User = require('../models/User');
const { generateTicketQR } = require('../utils/qrCodeGenerator');
const logger = require('../utils/logger');

/**
 * Mendapatkan semua tiket
 */
const getAllTickets = async (filter = {}, options = {}) => {
  try {
    const tickets = await Ticket.find(filter)
      .populate('user', 'name email')
      .populate('event', 'title date time location')
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50);
    
    return tickets;
  } catch (error) {
    logger.error('Error getting all tickets:', error);
    throw error;
  }
};

/**
 * Mendapatkan tiket berdasarkan ID
 */
const getTicketById = async (ticketId) => {
  try {
    const ticket = await Ticket.findById(ticketId)
      .populate('user', 'name email')
      .populate('event', 'title date time location organizer image');
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    
    return ticket;
  } catch (error) {
    logger.error(`Error getting ticket by ID ${ticketId}:`, error);
    throw error;
  }
};

/**
 * Mendapatkan tiket berdasarkan nomor tiket
 */
const getTicketByNumber = async (ticketNumber) => {
  try {
    const ticket = await Ticket.findOne({ ticketNumber })
      .populate('user', 'name email')
      .populate('event', 'title date time location organizer image');
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    
    return ticket;
  } catch (error) {
    logger.error(`Error getting ticket by number ${ticketNumber}:`, error);
    throw error;
  }
};

/**
 * Mendapatkan tiket berdasarkan event
 */
const getTicketsByEvent = async (eventId, filter = {}, options = {}) => {
  try {
    const eventFilter = { ...filter, event: eventId };
    
    const tickets = await Ticket.find(eventFilter)
      .populate('user', 'name email')
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50);
    
    return tickets;
  } catch (error) {
    logger.error(`Error getting tickets for event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Mendapatkan tiket berdasarkan pengguna
 */
const getTicketsByUser = async (userId, filter = {}, options = {}) => {
  try {
    const userFilter = { ...filter, user: userId };
    
    const tickets = await Ticket.find(userFilter)
      .populate('event', 'title date time location organizer image')
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50);
    
    return tickets;
  } catch (error) {
    logger.error(`Error getting tickets for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Memvalidasi tiket untuk check-in
 */
const validateTicketForCheckIn = async (ticketId, eventId, scannerId, scanLocation) => {
  try {
    const ticket = await Ticket.findById(ticketId).populate('event');
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    
    if (ticket.event._id.toString() !== eventId) {
      throw new Error('Ticket is not for this event');
    }
    
    if (ticket.isUsed) {
      throw new Error('Ticket has already been used');
    }
    
    if (ticket.paymentStatus !== 'paid') {
      throw new Error('Ticket payment is not completed');
    }
    
    // Perbarui tiket sebagai telah digunakan
    ticket.isUsed = true;
    ticket.checkInTime = new Date();
    ticket.checkInInfo = {
      scannedBy: scannerId,
      scannedAt: new Date(),
      scanLocation: scanLocation || 'Unknown'
    };
    
    await ticket.save();
    return ticket;
  } catch (error) {
    logger.error(`Error validating ticket ${ticketId} for check-in:`, error);
    throw error;
  }
};

/**
 * Mentransfer tiket ke pengguna lain
 */
const transferTicket = async (ticketId, currentUserId, recipientEmail) => {
  try {
    const ticket = await Ticket.findOne({
      _id: ticketId,
      user: currentUserId
    }).populate('event');
    
    if (!ticket) {
      throw new Error('Ticket not found or not owned by current user');
    }
    
    if (ticket.isUsed) {
      throw new Error('Ticket has already been used');
    }
    
    if (ticket.paymentStatus !== 'paid') {
      throw new Error('Ticket payment is not completed');
    }
    
    const recipient = await User.findOne({ email: recipientEmail });
    if (!recipient) {
      throw new Error('Recipient user not found');
    }
    
    // Generate new QR code for recipient
    const qrData = await generateTicketQR(
      ticket._id.toString(),
      ticket.event._id.toString(),
      recipient._id.toString()
    );
    
    // Update ticket ownership
    ticket.user = recipient._id;
    ticket.qrCode = qrData;
    ticket.transferHistory = ticket.transferHistory || [];
    ticket.transferHistory.push({
      from: currentUserId,
      to: recipient._id,
      transferredAt: new Date()
    });
    
    await ticket.save();
    return ticket;
  } catch (error) {
    logger.error(`Error transferring ticket ${ticketId}:`, error);
    throw error;
  }
};

/**
 * Mendapatkan statistik check-in untuk event
 */
const getEventCheckInStats = async (eventId) => {
  try {
    const totalTickets = await Ticket.countDocuments({
      event: eventId,
      paymentStatus: 'paid'
    });
    
    const checkedInTickets = await Ticket.countDocuments({
      event: eventId,
      paymentStatus: 'paid',
      isUsed: true
    });
    
    const percentCheckedIn = totalTickets > 0 ? Math.round((checkedInTickets / totalTickets) * 100) : 0;
    
    const recentCheckIns = await Ticket.find({
      event: eventId,
      isUsed: true
    })
      .populate('user', 'name email')
      .populate('checkInInfo.scannedBy', 'name role')
      .sort({ checkInTime: -1 })
      .limit(10);
    
    return {
      totalTickets,
      checkedInTickets,
      percentCheckedIn,
      remainingTickets: totalTickets - checkedInTickets,
      recentCheckIns
    };
  } catch (error) {
    logger.error(`Error getting check-in stats for event ${eventId}:`, error);
    throw error;
  }
};

module.exports = {
  getAllTickets,
  getTicketById,
  getTicketByNumber,
  getTicketsByEvent,
  getTicketsByUser,
  validateTicketForCheckIn,
  transferTicket,
  getEventCheckInStats
}; 