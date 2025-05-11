const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const logger = require('../utils/logger');
const midtransClient = require('midtrans-client');

/**
 * @desc    Mendapatkan riwayat pembayaran user
 * @route   GET /api/payments/history
 * @access  Private
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const payments = await Payment.find({ user: userId })
      .populate('ticket')
      .populate({
        path: 'ticket',
        populate: { path: 'event' }
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      payments
    });
  } catch (error) {
    logger.error('Error saat mengambil riwayat pembayaran', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat pembayaran',
      error: error.message
    });
  }
};

module.exports = {
  getPaymentHistory
}; 