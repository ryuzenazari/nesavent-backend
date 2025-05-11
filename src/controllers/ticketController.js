const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Transaction = require('../models/Transaction');
const midtransService = require('../services/midtransService');
const User = require('../models/User');
const { generateTicketQR, verifyTicketQR } = require('../utils/qrCodeGenerator');
const {
  sendTicketConfirmation,
  sendTicketTransferNotification,
  sendTicketTransferConfirmation
} = require('../services/emailService');
const logger = require('../utils/logger');
const analyticsService = require('../services/analyticsService');
const responseFormatter = require('../utils/responseFormatter');
const TicketType = require('../models/TicketType');
const PromoCode = require('../models/PromoCode');
const ticketPricingService = require('../services/ticketPricingService');

const purchaseTicket = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { eventId, ticketTypeId, quantity } = req.body;
    const userId = req.userId;

    // Validasi event
    const event = await Event.findById(eventId).session(session);
    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return responseFormatter.notFound(res, "Event tidak ditemukan");
    }

    // Validasi tipe tiket
    const ticketType = event.ticketTypes.id(ticketTypeId);
    if (!ticketType) {
      await session.abortTransaction();
      session.endSession();
      return responseFormatter.notFound(res, "Tipe tiket tidak ditemukan");
    }

    // Cek ketersediaan tiket
    if (ticketType.availableQuantity < quantity) {
      await session.abortTransaction();
      session.endSession();
      return responseFormatter.error(res, "Tiket tidak tersedia dalam jumlah yang diminta", null, 400);
    }

    // Kurangi jumlah tiket tersedia
    ticketType.availableQuantity -= quantity;
    event.availableTickets -= quantity;
    await event.save({ session });

    // Buat tiket untuk pengguna
    const tickets = [];
    for (let i = 0; i < quantity; i++) {
      const ticket = new Ticket({
        eventId,
        userId,
        ticketTypeId: ticketType._id,
        ticketTypeName: ticketType.name,
        price: ticketType.price,
        status: 'active',
        purchaseDate: new Date()
      });
      await ticket.save({ session });
      tickets.push(ticket);
    }

    await session.commitTransaction();
    session.endSession();

    return responseFormatter.success(
      res,
      "Tiket berhasil dibeli",
      { tickets },
      201
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`Error purchasing ticket: ${error.message}`);
    return responseFormatter.error(res, "Gagal membeli tiket", error.message);
  }
};

/**
 * @desc    Mendapatkan semua tiket yang dimiliki user
 * @route   GET /api/tickets/my-tickets
 * @access  Private
 */
const getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const tickets = await Ticket.find({ user: userId })
      .populate('event')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      tickets
    });
  } catch (error) {
    logger.error('Error saat mengambil tiket user', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil tiket',
      error: error.message
    });
  }
};

const checkTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.userId;

    const ticket = await Ticket.findById(ticketId)
      .populate('eventId', 'title date time location image organizer')
      .populate('userId', 'name email profileImage');

    if (!ticket) {
      return responseFormatter.notFound(res, "Tiket tidak ditemukan");
    }

    // Cek apakah tiket milik pengguna ini atau pengguna adalah admin
    const user = await User.findById(userId);
    const isOwner = ticket.userId._id.toString() === userId;
    const isAdmin = user.role === 'admin';
    const isEventCreator = ticket.eventId.createdBy.toString() === userId;

    if (!isOwner && !isAdmin && !isEventCreator) {
      return responseFormatter.forbidden(res, "Anda tidak memiliki izin untuk melihat tiket ini");
    }

    return responseFormatter.success(res, "Detail tiket berhasil diambil", { ticket });
  } catch (error) {
    logger.error(`Error checking ticket: ${error.message}`);
    return responseFormatter.error(res, "Gagal memeriksa tiket", error.message);
  }
};

const validateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.userId;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return responseFormatter.notFound(res, "Tiket tidak ditemukan");
    }

    // Cek apakah tiket sudah digunakan
    if (ticket.status === 'used') {
      return responseFormatter.error(res, "Tiket sudah digunakan", null, 400);
    }

    // Cek apakah tiket sudah dibatalkan
    if (ticket.status === 'cancelled') {
      return responseFormatter.error(res, "Tiket telah dibatalkan", null, 400);
    }

    // Cek apakah pengguna adalah admin atau pembuat event
    const user = await User.findById(userId);
    const event = await Event.findById(ticket.eventId);
    const isAdmin = user.role === 'admin';
    const isEventCreator = event.createdBy.toString() === userId;

    if (!isAdmin && !isEventCreator) {
      return responseFormatter.forbidden(res, "Anda tidak memiliki izin untuk memvalidasi tiket");
    }

    // Update status tiket
    ticket.status = 'used';
    ticket.checkInDate = new Date();
    ticket.validatedBy = userId;
    await ticket.save();

    return responseFormatter.success(res, "Tiket berhasil divalidasi", { ticket });
  } catch (error) {
    logger.error(`Error validating ticket: ${error.message}`);
    return responseFormatter.error(res, "Gagal memvalidasi tiket", error.message);
  }
};

const getTicketTypesByEventId = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Cari event berdasarkan ID
    const event = await Event.findById(eventId);
    if (!event) {
      return responseFormatter.notFound(res, "Event tidak ditemukan");
    }

    // Cari tipe tiket untuk event
    const ticketTypes = event.ticketTypes || [];

    return responseFormatter.success(res, "Tipe tiket berhasil diambil", { ticketTypes });
  } catch (error) {
    logger.error(`Error getting ticket types: ${error.message}`);
    return responseFormatter.error(res, "Gagal mengambil tipe tiket", error.message);
  }
};

/**
 * @desc    Memvalidasi kode promo
 * @route   POST /api/tickets/validate-promo
 * @access  Private
 */
const validatePromoCode = async (req, res) => {
  try {
    const { code, amount } = req.body;
    const userId = req.user.id;
    
    // Cari promo code
    const promoCode = await PromoCode.findOne({ 
      code, 
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });
    
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Kode promo tidak valid atau sudah kadaluarsa'
      });
    }
    
    // Validasi minimum purchase
    if (promoCode.minPurchase && amount < promoCode.minPurchase) {
      return res.status(400).json({
        success: false,
        message: `Total pembelian minimum untuk promo ini adalah Rp${promoCode.minPurchase}`
      });
    }
    
    // Hitung diskon
    let discount = 0;
    if (promoCode.type === 'percentage') {
      discount = (amount * promoCode.value) / 100;
      if (promoCode.maxDiscount && discount > promoCode.maxDiscount) {
        discount = promoCode.maxDiscount;
      }
    } else {
      discount = promoCode.value;
    }
    
    res.json({
      success: true,
      promoCode,
      discount,
      finalAmount: amount - discount
    });
  } catch (error) {
    logger.error('Error saat memvalidasi kode promo', {
      error: error.message,
      userId: req.user.id,
      code: req.body.code
    });
    
    res.status(500).json({
      success: false,
      message: 'Gagal memvalidasi kode promo',
      error: error.message
    });
  }
};

/**
 * @desc    Mendapatkan detail harga tiket dengan biaya tambahan
 * @route   GET /api/tickets/price-details/:ticketTypeId
 * @access  Public
 */
const getPriceDetails = async (req, res) => {
  try {
    const { ticketTypeId } = req.params;
    const { paymentMethod } = req.query;
    
    // Validasi parameter paymentMethod
    const validPaymentMethods = ['bank_transfer', 'credit_card', 'e_wallet', 'qris', 'retail'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return responseFormatter.error(res, "Metode pembayaran tidak valid", null, 400);
    }
    
    // Cari tipe tiket
    const event = await Event.findOne({ "ticketTypes._id": ticketTypeId });
    if (!event) {
      return responseFormatter.notFound(res, "Tipe tiket tidak ditemukan");
    }
    
    const ticketType = event.ticketTypes.id(ticketTypeId);
    if (!ticketType) {
      return responseFormatter.notFound(res, "Tipe tiket tidak ditemukan");
    }
    
    // Hitung semua komponen biaya (harga dasar, biaya platform, biaya Midtrans)
    const priceDetails = ticketPricingService.calculateBuyerPrice(ticketType.price, paymentMethod);
    
    return responseFormatter.success(res, "Detail harga tiket berhasil dibuat", { 
      ticketType: {
        _id: ticketType._id,
        name: ticketType.name,
        description: ticketType.description,
        availableQuantity: ticketType.availableQuantity
      },
      priceDetails: priceDetails,
      paymentMethodFees: ticketPricingService.getMidtransFeeDescription(),
      platformFeePercentage: ticketPricingService.PLATFORM_FEE_PERCENTAGE
    });
  } catch (error) {
    logger.error(`Error getting price details: ${error.message}`);
    return responseFormatter.error(res, "Gagal mendapatkan detail harga", error.message);
  }
};

module.exports = {
  purchaseTicket,
  getMyTickets,
  checkTicket,
  validateTicket,
  getTicketTypesByEventId,
  validatePromoCode,
  getPriceDetails
};
