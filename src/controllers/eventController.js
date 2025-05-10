const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const shortLinkService = require('../services/shortLinkService');
const createEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
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
        const parsedTicketTypes = typeof ticketTypes === 'string' 
          ? JSON.parse(ticketTypes) 
          : ticketTypes;
          
        const processedTicketTypes = parsedTicketTypes.map(type => ({
          ...type,
          availableQuantity: type.quantity
        }));
        
        eventData.ticketTypes = processedTicketTypes;
      } catch (parseError) {
        logger.error(`Error parsing ticketTypes: ${parseError.message}`);
        return res.status(400).json({ message: 'Format tipe tiket tidak valid' });
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
    res.status(500).json({ message: 'Gagal membuat event', error: error.message });
  }
};
const getAllEvents = async (req, res) => {
  try {
    const { category, search, startDate, endDate, sort = 'date', order = 'asc' } = req.query;
    
    const query = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { organizer: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.date = { $lte: new Date(endDate) };
    }
    
    const sortOption = {};
    sortOption[sort] = order === 'desc' ? -1 : 1;
    
    const events = await Event.find(query)
      .sort(sortOption)
      .select('-__v');
    
    res.status(200).json({
      count: events.length,
      events
    });
  } catch (error) {
    logger.error(`Get events error: ${error.message}`);
    res.status(500).json({ message: 'Gagal mengambil daftar event', error: error.message });
  }
};
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }
    
    res.status(200).json({
      event
    });
  } catch (error) {
    logger.error(`Get event by ID error: ${error.message}`);
    res.status(500).json({ message: 'Gagal mengambil detail event', error: error.message });
  }
};
const updateEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
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
      return res.status(404).json({ message: 'Event tidak ditemukan' });
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
      return res.status(403).json({ message: 'Tidak memiliki izin untuk mengubah event ini' });
    }
    
    if (updates.ticketTypes) {
      try {
        const parsedTicketTypes = typeof updates.ticketTypes === 'string' 
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
                throw new Error(`Tidak dapat mengurangi kuantitas tiket "${newType.name}" karena sudah terjual ${soldTickets} tiket`);
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
        return res.status(400).json({ message: 'Format tipe tiket tidak valid: ' + parseError.message });
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
        
        logger.warn(`Staff creator ${req.userId} mencoba mengubah field yang tidak diizinkan pada event ${eventId}`);
        return res.status(403).json({ 
          message: 'Staff creator hanya dapat mengubah informasi dasar event (judul, deskripsi, lokasi, kategori)'
        });
      }
      
      updates = filteredUpdates;
    }
    
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    logger.info(`Event updated: ${event.title} by user: ${req.userId}`);
    
    res.status(200).json({
      message: 'Event berhasil diperbarui',
      event: updatedEvent
    });
  } catch (error) {
    logger.error(`Update event error: ${error.message}`);
    res.status(500).json({ message: 'Gagal memperbarui event', error: error.message });
  }
};
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }
    
    const isCreator = event.createdBy.toString() === req.userId;
    const user = await User.findById(req.userId);
    const isAdmin = user.role === 'admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Tidak memiliki izin untuk menghapus event ini' });
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
    res.status(500).json({ message: 'Gagal menghapus event', error: error.message });
  }
};
const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.userId });
    
    logger.info(`User ${req.userId} mengambil daftar event yang dibuat`);
    
    res.status(200).json({
      count: events.length,
      events
    });
  } catch (error) {
    logger.error(`Get my events error: ${error.message}`);
    res.status(500).json({ message: 'Gagal mengambil daftar event Anda', error: error.message });
  }
};
const manageTicketTypes = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { eventId, ticketTypes } = req.body;
    
    if (!ticketTypes || !Array.isArray(ticketTypes)) {
      return res.status(400).json({ message: 'Format tipe tiket tidak valid' });
    }
    
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }
    
    const isCreator = event.createdBy.toString() === req.userId;
    const user = await User.findById(req.userId);
    const isAdmin = user.role === 'admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Tidak memiliki izin untuk mengelola tipe tiket' });
    }
    
    const existingTicketTypes = event.ticketTypes || [];
    
    const processedTicketTypes = ticketTypes.map(newType => {
      const existingType = existingTicketTypes.find(
        t => t._id && newType._id && t._id.toString() === newType._id.toString()
      );
      
      if (existingType) {
        const soldTickets = existingType.quantity - existingType.availableQuantity;
        
        if (newType.quantity < soldTickets) {
          throw new Error(`Tidak dapat mengurangi kuantitas tiket "${newType.name}" karena sudah terjual ${soldTickets} tiket`);
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
    const availableTickets = processedTicketTypes.reduce((sum, type) => sum + type.availableQuantity, 0);
    
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
    res.status(500).json({ message: 'Gagal memperbarui tipe tiket', error: error.message });
  }
};
const generateEventShortLink = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID event tidak valid' });
    }
    
    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }
    
    if (event.createdBy.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Anda tidak memiliki akses untuk membuat shortlink untuk event ini' });
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
    res.status(500).json({ message: 'Terjadi kesalahan saat membuat shortlink', error: error.message });
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
  generateEventShortLink
}; 