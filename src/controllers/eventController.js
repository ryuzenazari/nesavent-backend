const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const User = require('../models/User');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const shortLinkService = require('../services/shortLinkService');
const eventService = require('../services/eventService');
const cacheService = require('../services/cacheService');
const imageOptimization = require('../services/imageOptimizationService');
const responseFormatter = require('../utils/responseFormatter');
const createEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const {
      title,
      description,
      date,
      time,
      location,
      category,
      organizer,
      totalTickets,
      price,
      ticketTypes
    } = req.body;
    const files = req.files || {};
    const image = files.image ? `/uploads/events/${files.image[0].filename}` : null;
    const banner = files.banner ? `/uploads/events/${files.banner[0].filename}` : null;
    const eventData = {
      title,
      description,
      date,
      time,
      location,
      category,
      image,
      banner,
      organizer,
      totalTickets,
      availableTickets: totalTickets,
      price,
      createdBy: req.userId
    };
    if (ticketTypes && Array.isArray(ticketTypes) && ticketTypes.length > 0) {
      try {
        const parsedTicketTypes =
          typeof ticketTypes === 'string' ? JSON.parse(ticketTypes) : ticketTypes;
        const processedTicketTypes = parsedTicketTypes.map(type => ({
          ...type,
          availableQuantity: type.quantity
        }));
        eventData.ticketTypes = processedTicketTypes;
      } catch (parseError) {
        logger.error(`Error parsing ticketTypes: ${parseError.message}`);
        return res.status(400).json({
          message: 'Format tipe tiket tidak valid'
        });
      }
    }
    const event = new Event(eventData);
    await event.save();
    logger.info(`Event created: ${title} by user: ${req.userId}`);
    res.status(201).json({
      message: 'Event berhasil dibuat',
      event
    });
  } catch (error) {
    try {
      if (req.files) {
        if (req.files.image && req.files.image[0]) {
          fs.unlinkSync(req.files.image[0].path);
        }
        if (req.files.banner && req.files.banner[0]) {
          fs.unlinkSync(req.files.banner[0].path);
        }
      }
    } catch (unlinkError) {
      logger.error(`Error deleting uploaded files: ${unlinkError.message}`);
    }
    logger.error(`Create event error: ${error.message}`);
    res.status(500).json({
      message: 'Gagal membuat event',
      error: error.message
    });
  }
};
const getAllEvents = async (req, res) => {
  try {
    const cacheKey = `events_${JSON.stringify(req.query)}`;
    const cachedEvents = cacheService.get(cacheKey);
    
    if (cachedEvents) {
      return res.json(cachedEvents);
    }
    
    let query = {};
    
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }
    
    if (req.query.category) {
      query.categories = req.query.category;
    }
    
    if (req.query.location) {
      query['location.city'] = req.query.location;
    }
    
    if (req.query.date) {
      const date = new Date(req.query.date);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      
      query.date = { $gte: date, $lt: nextDay };
    }
    
    query.isPublished = true;
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const events = await Event.find(query)
      .populate('creator', 'username _id profilePicture')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Event.countDocuments(query);
    
    const result = {
      events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
    
    cacheService.set(cacheKey, result, 300); // Cache for 5 minutes
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Error fetching events", error: error.message });
  }
};
const getEventById = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    
    const event = await Event.findById(eventId)
      .populate('creator', 'name email profileImage');
      
    if (!event) {
      return responseFormatter.notFound(res, "Event tidak ditemukan");
    }
    
    return responseFormatter.success(res, "Detail event berhasil diambil", event);
  } catch (error) {
    logger.error(`Error getting event details: ${error.message || 'Unknown error'}`);
    return responseFormatter.error(res, "Terjadi kesalahan saat mengambil detail event", error.message || 'Unknown error');
  }
};
const updateEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const updates = req.body;
    const eventId = req.params.id;
    const files = req.files || {};
    if (files.image && files.image[0]) {
      updates.image = `/uploads/events/${files.image[0].filename}`;
    }
    if (files.banner && files.banner[0]) {
      updates.banner = `/uploads/events/${files.banner[0].filename}`;
    }
    const event = await Event.findById(eventId);
    if (!event) {
      if (files.image && files.image[0]) {
        fs.unlinkSync(files.image[0].path);
      }
      if (files.banner && files.banner[0]) {
        fs.unlinkSync(files.banner[0].path);
      }
      return res.status(404).json({
        message: 'Event tidak ditemukan'
      });
    }
    const isCreator = event.createdBy.toString() === req.userId;
    const user = await User.findById(req.userId);
    const isAdmin = user.role === 'admin';
    const isStaffCreator = user.role === 'staff_creator';
    if (!isCreator && !isAdmin && !isStaffCreator) {
      if (files.image && files.image[0]) {
        fs.unlinkSync(files.image[0].path);
      }
      if (files.banner && files.banner[0]) {
        fs.unlinkSync(files.banner[0].path);
      }
      return res.status(403).json({
        message: 'Tidak memiliki izin untuk mengubah event ini'
      });
    }
    if (updates.ticketTypes) {
      try {
        const parsedTicketTypes =
          typeof updates.ticketTypes === 'string'
            ? JSON.parse(updates.ticketTypes)
            : updates.ticketTypes;
        if (!isCreator && !isAdmin) {
          delete updates.ticketTypes;
        } else {
          const existingTicketTypes = event.ticketTypes || [];
          const processedTicketTypes = parsedTicketTypes.map(newType => {
            const existingType = existingTicketTypes.find(
              t => t._id && newType._id && t._id.toString() === newType._id.toString()
            );
            if (existingType) {
              const soldTickets = existingType.quantity - existingType.availableQuantity;
              if (newType.quantity < soldTickets) {
                throw new Error(
                  `Tidak dapat mengurangi kuantitas tiket "${newType.name}" karena sudah terjual ${
                    soldTickets
                  } tiket`
                );
              }
              return {
                ...newType,
                availableQuantity: newType.quantity - soldTickets
              };
            } else {
              return {
                ...newType,
                availableQuantity: newType.quantity
              };
            }
          });
          updates.ticketTypes = processedTicketTypes;
        }
      } catch (parseError) {
        logger.error(`Error parsing ticketTypes: ${parseError.message}`);
        return res.status(400).json({
          message: 'Format tipe tiket tidak valid: ' + parseError.message
        });
      }
    }
    if (isStaffCreator && !isCreator && !isAdmin) {
      const allowedUpdates = ['title', 'description', 'location', 'category'];
      const filteredUpdates = {};
      for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }
      if (Object.keys(updates).some(key => !allowedUpdates.includes(key))) {
        if (files.image && files.image[0]) {
          fs.unlinkSync(files.image[0].path);
        }
        if (files.banner && files.banner[0]) {
          fs.unlinkSync(files.banner[0].path);
        }
        logger.warn(
          `Staff creator ${req.userId} mencoba mengubah field yang tidak diizinkan pada event ${
            eventId
          }`
        );
        return res.status(403).json({
          message:
            'Staff creator hanya dapat mengubah informasi dasar event (judul, deskripsi, lokasi, kategori)'
        });
      }
      updates = filteredUpdates;
    }
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      {
        $set: updates
      },
      {
        new: true,
        runValidators: true
      }
    );
    logger.info(`Event updated: ${event.title} by user: ${req.userId}`);
    res.status(200).json({
      message: 'Event berhasil diperbarui',
      event: updatedEvent
    });
  } catch (error) {
    logger.error(`Update event error: ${error.message}`);
    res.status(500).json({
      message: 'Gagal memperbarui event',
      error: error.message
    });
  }
};
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        message: 'Event tidak ditemukan'
      });
    }
    const isCreator = event.createdBy.toString() === req.userId;
    const user = await User.findById(req.userId);
    const isAdmin = user.role === 'admin';
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        message: 'Tidak memiliki izin untuk menghapus event ini'
      });
    }
    if (event.image) {
      const imagePath = path.join(__dirname, '../../', event.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    if (event.banner) {
      const bannerPath = path.join(__dirname, '../../', event.banner);
      if (fs.existsSync(bannerPath)) {
        fs.unlinkSync(bannerPath);
      }
    }
    await Event.findByIdAndDelete(req.params.id);
    logger.info(`Event deleted: ${event.title} by user: ${req.userId}`);
    res.status(200).json({
      message: 'Event berhasil dihapus'
    });
  } catch (error) {
    logger.error(`Delete event error: ${error.message}`);
    res.status(500).json({
      message: 'Gagal menghapus event',
      error: error.message
    });
  }
};
const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({
      createdBy: req.userId
    });
    logger.info(`User ${req.userId} mengambil daftar event yang dibuat`);
    res.status(200).json({
      count: events.length,
      events
    });
  } catch (error) {
    logger.error(`Get my events error: ${error.message}`);
    res.status(500).json({
      message: 'Gagal mengambil daftar event Anda',
      error: error.message
    });
  }
};
const manageTicketTypes = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const { eventId, ticketTypes } = req.body;
    if (!ticketTypes || !Array.isArray(ticketTypes)) {
      return res.status(400).json({
        message: 'Format tipe tiket tidak valid'
      });
    }
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        message: 'Event tidak ditemukan'
      });
    }
    const isCreator = event.createdBy.toString() === req.userId;
    const user = await User.findById(req.userId);
    const isAdmin = user.role === 'admin';
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        message: 'Tidak memiliki izin untuk mengelola tipe tiket'
      });
    }
    const existingTicketTypes = event.ticketTypes || [];
    const processedTicketTypes = ticketTypes.map(newType => {
      const existingType = existingTicketTypes.find(
        t => t._id && newType._id && t._id.toString() === newType._id.toString()
      );
      if (existingType) {
        const soldTickets = existingType.quantity - existingType.availableQuantity;
        if (newType.quantity < soldTickets) {
          throw new Error(
            `Tidak dapat mengurangi kuantitas tiket "${newType.name}" karena sudah terjual ${
              soldTickets
            } tiket`
          );
        }
        return {
          ...newType,
          availableQuantity: newType.quantity - soldTickets
        };
      } else {
        return {
          ...newType,
          availableQuantity: newType.quantity
        };
      }
    });
    event.ticketTypes = processedTicketTypes;
    const totalTickets = processedTicketTypes.reduce((sum, type) => sum + type.quantity, 0);
    const availableTickets = processedTicketTypes.reduce(
      (sum, type) => sum + type.availableQuantity,
      0
    );
    event.totalTickets = totalTickets;
    event.availableTickets = availableTickets;
    await event.save();
    logger.info(`Ticket types updated for event: ${event.title} by user: ${req.userId}`);
    res.status(200).json({
      message: 'Tipe tiket berhasil diperbarui',
      event
    });
  } catch (error) {
    logger.error(`Manage ticket types error: ${error.message}`);
    res.status(500).json({
      message: 'Gagal memperbarui tipe tiket',
      error: error.message
    });
  }
};
const generateEventShortLink = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'ID event tidak valid'
      });
    }
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        message: 'Event tidak ditemukan'
      });
    }
    if (event.createdBy.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({
        message: 'Anda tidak memiliki akses untuk membuat shortlink untuk event ini'
      });
    }
    const linkData = {
      targetType: 'event',
      targetId: event._id,
      targetModel: 'Event'
    };
    
    const shortLink = await shortLinkService.createShortLink(linkData, req.userId);
    const shortUrl = `${process.env.API_URL || req.protocol + '://' + req.get('host')}/s/${shortLink.code}`;
    res.status(201).json({
      message: 'Shortlink untuk event berhasil dibuat',
      shortLink: {
        code: shortLink.code,
        shortUrl,
        visits: shortLink.visits,
        isActive: shortLink.isActive,
        createdAt: shortLink.createdAt
      }
    });
  } catch (error) {
    logger.error(`Error saat membuat shortlink event: ${error.message}`);
    res.status(500).json({
      message: 'Terjadi kesalahan saat membuat shortlink',
      error: error.message
    });
  }
};
const enableEarlyBird = async (req, res) => {
  try {
    const { eventId, ticketTypeId } = req.params;
    const earlyBirdData = req.body;
    const event = await eventService.enableEarlyBird(eventId, ticketTypeId, earlyBirdData);
    res.status(200).json({
      success: true,
      message: 'Early bird pricing berhasil diaktifkan',
      data: event
    });
  } catch (error) {
    logger.error('Error in enableEarlyBird controller:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
const addPromoCode = async (req, res) => {
  try {
    const { eventId } = req.params;
    const promoCodeData = req.body;
    const event = await eventService.addPromoCode(eventId, promoCodeData);
    res.status(200).json({
      success: true,
      message: 'Promo code berhasil ditambahkan',
      data: event
    });
  } catch (error) {
    logger.error('Error in addPromoCode controller:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
const enableWaitingList = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { maxCapacity } = req.body;
    const event = await eventService.enableWaitingList(eventId, maxCapacity);
    res.status(200).json({
      success: true,
      message: 'Waiting list berhasil diaktifkan',
      data: event
    });
  } catch (error) {
    logger.error('Error in enableWaitingList controller:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
const addToWaitingList = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { ticketType, quantity } = req.body;
    const userId = req.user._id;
    const waitingListEntry = await eventService.addToWaitingList(
      eventId,
      userId,
      ticketType,
      quantity
    );
    res.status(200).json({
      success: true,
      message: 'Berhasil ditambahkan ke waiting list',
      data: waitingListEntry
    });
  } catch (error) {
    logger.error('Error in addToWaitingList controller:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
const setupRecurringEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const recurringData = req.body;
    const event = await eventService.setupRecurringEvent(eventId, recurringData);
    res.status(200).json({
      success: true,
      message: 'Recurring event berhasil diatur',
      data: event
    });
  } catch (error) {
    logger.error('Error in setupRecurringEvent controller:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
const setupRefundPolicy = async (req, res) => {
  try {
    const { eventId } = req.params;
    const refundPolicyData = req.body;
    const event = await eventService.setupRefundPolicy(eventId, refundPolicyData);
    res.status(200).json({
      success: true,
      message: 'Refund policy berhasil diatur',
      data: event
    });
  } catch (error) {
    logger.error('Error in setupRefundPolicy controller:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
const processRefund = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const refundData = req.body;
    const userId = req.user._id;
    const refund = await eventService.processRefund(ticketId, userId, refundData);
    res.status(200).json({
      success: true,
      message: 'Refund berhasil diproses',
      data: refund
    });
  } catch (error) {
    logger.error('Error in processRefund controller:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
const approveRefund = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { adminNote } = req.body;
    const adminId = req.user._id;
    const refund = await eventService.approveRefund(refundId, adminId, adminNote);
    res.status(200).json({
      success: true,
      message: 'Refund berhasil disetujui',
      data: refund
    });
  } catch (error) {
    logger.error('Error in approveRefund controller:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
const approveEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const adminId = req.user._id;

    // Cek apakah event ada
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan'
      });
    }

    // Update status event menjadi approved
    event.status = 'approved';
    event.modifiedBy = adminId;
    event.approvedAt = new Date();
    await event.save();

    // Kirim respons sukses
    res.status(200).json({
      success: true,
      message: 'Event berhasil disetujui',
      data: event
    });
  } catch (error) {
    logger.error('Error in approveEvent controller:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menyetujui event',
      error: error.message
    });
  }
};
const rejectEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    // Cek apakah event ada
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan'
      });
    }

    // Update status event menjadi rejected
    event.status = 'rejected';
    event.rejectionReason = reason || 'Tidak memenuhi persyaratan';
    event.modifiedBy = adminId;
    event.rejectedAt = new Date();
    await event.save();

    // Kirim respons sukses
    res.status(200).json({
      success: true,
      message: 'Event berhasil ditolak',
      data: event
    });
  } catch (error) {
    logger.error('Error in rejectEvent controller:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menolak event',
      error: error.message
    });
  }
};

// Fungsi untuk mendapatkan daftar event
const getEvents = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      category,
      startDate,
      endDate,
      status = 'approved'
    } = req.query;
    
    const query = { status };
    
    // Filter berdasarkan pencarian
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { organizer: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter berdasarkan kategori
    if (category) {
      query.category = category;
    }
    
    // Filter berdasarkan tanggal
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.date = { $lte: new Date(endDate) };
    }
    
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { date: 1 }, // Urut berdasarkan tanggal terdekat
      populate: { path: 'creator', select: 'name email profileImage' }
    };
    
    const events = await Event.paginate(query, options);
    
    res.status(200).json({
      success: true,
      data: events.docs,
      pagination: {
        total: events.totalDocs,
        page: events.page,
        pages: events.totalPages,
        limit: events.limit
      }
    });
  } catch (error) {
    logger.error('Error getting events: ' + (error.message || 'Unknown error'));
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar event',
      error: error.message || String(error)
    });
  }
};

// Fungsi untuk mendapatkan event berdasarkan shortLink
const getEventByShortLink = async (req, res) => {
  try {
    const { shortLink } = req.params;
    
    // Cari shortLink di database
    const shortLinkDoc = await shortLinkService.getShortLinkByCode(shortLink);
    
    if (!shortLinkDoc || shortLinkDoc.targetType !== 'event') {
      return res.status(404).json({
        success: false,
        message: 'Link tidak valid atau sudah tidak tersedia'
      });
    }
    
    // Cari event berdasarkan ID dari shortLink
    const event = await Event.findById(shortLinkDoc.targetId)
      .populate('creator', 'name email profileImage')
      .populate('ticketTypes');
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan'
      });
    }
    
    // Catat kunjungan
    await shortLinkService.trackShortLinkVisit(shortLink, req.ip);
    
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    logger.error('Error getting event by short link: ' + (error.message || 'Unknown error'));
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil detail event',
      error: error.message || String(error)
    });
  }
};

/**
 * @desc    Mencari event berdasarkan kata kunci
 * @route   GET /api/events/search
 * @access  Public
 */
const searchEvents = async (req, res) => {
  try {
    const { q } = req.query;
    
    // Gunakan text search dengan regex untuk mendukung pencarian fleksibel
    const events = await Event.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { organizer: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ],
      status: 'approved'
    })
    .populate('creator', 'name email profileImage')
    .sort({ startDate: 1 });
    
    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    logger.error('Error saat mencari event', {
      error: error.message,
      query: req.query.q
    });
    
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mencari event',
      error: error.message
    });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getMyEvents,
  manageTicketTypes,
  generateEventShortLink,
  enableEarlyBird,
  addPromoCode,
  enableWaitingList,
  addToWaitingList,
  setupRecurringEvent,
  setupRefundPolicy,
  processRefund,
  approveRefund,
  approveEvent,
  rejectEvent,
  getEvents,
  getEventByShortLink,
  searchEvents
};
