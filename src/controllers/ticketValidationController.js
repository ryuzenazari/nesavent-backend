const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const User = require('../models/User');
const { verifyTicketQR } = require('../utils/qrCodeGenerator');
const logger = require('../utils/logger');

const validateTicket = async (req, res) => {
  try {
    const { qrData, scanLocation, eventId } = req.body;

    if (!qrData || !qrData.tid || !qrData.vc) {
      return res.status(400).json({
        success: false,
        message: 'Data QR code tidak valid atau tidak lengkap'
      });
    }

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'ID Event diperlukan untuk validasi tiket'
      });
    }

    const ticket = await Ticket.findById(qrData.tid).populate('event').populate('user');
    
    if (!ticket) {
      logger.warn('Percobaan validasi tiket yang tidak ada', {
        qrData
      });
      return res.status(404).json({
        success: false,
        message: 'Tiket tidak ditemukan'
      });
    }

    if (ticket.event._id.toString() !== eventId) {
      logger.warn('Percobaan validasi tiket untuk event yang berbeda', {
        ticketEventId: ticket.event._id,
        requestedEventId: eventId
      });
      return res.status(400).json({
        success: false,
        message: 'Tiket ini tidak terkait dengan event yang dipilih'
      });
    }

    const verificationResult = verifyTicketQR(qrData, ticket);
    if (!verificationResult.valid) {
      logger.warn('Validasi tiket gagal', {
        ticketId: ticket._id,
        reason: verificationResult.message
      });
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    if (!ticket.isUsed) {
      ticket.isUsed = true;
      ticket.checkInTime = new Date();
      ticket.checkInInfo = {
        scannedBy: req.user._id,
        scannedAt: new Date(),
        scanLocation: scanLocation || 'Unknown'
      };
      await ticket.save();
      logger.info('Tiket berhasil divalidasi', {
        ticketId: ticket._id,
        eventId: ticket.event._id,
        userId: ticket.user._id,
        staffId: req.user._id,
        staffRole: req.user.role
      });
      return res.status(200).json({
        success: true,
        message: 'Tiket valid dan berhasil digunakan',
        ticket: {
          id: ticket._id,
          ticketNumber: ticket.ticketNumber,
          event: {
            id: ticket.event._id,
            title: ticket.event.title,
            date: ticket.event.date,
            time: ticket.event.time,
            location: ticket.event.location
          },
          user: {
            id: ticket.user._id,
            name: ticket.user.name,
            email: ticket.user.email
          },
          ticketType: ticket.ticketType,
          checkInTime: ticket.checkInTime,
          scanner: {
            name: req.user.name,
            role: req.user.role
          }
        }
      });
    } else {
      logger.warn('Percobaan menggunakan tiket yang sudah digunakan', {
        ticketId: ticket._id,
        checkInTime: ticket.checkInTime,
        staffId: req.user._id
      });
      return res.status(400).json({
        success: false,
        message: 'Tiket sudah digunakan sebelumnya',
        checkInTime: ticket.checkInTime,
        scannedBy: ticket.checkInInfo?.scannedBy ? 'Staff lain' : 'Unknown'
      });
    }
  } catch (error) {
    logger.error('Error validasi tiket', {
      error: error.message
    });
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat validasi tiket'
    });
  }
};

const getEventCheckInStats = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan'
      });
    }
    if (
      event.createdBy.toString() !== req.user._id.toString() &&
      !['staff_creator', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk melihat statistik event ini'
      });
    }
    const totalTickets = await Ticket.countDocuments({
      event: eventId,
      paymentStatus: 'paid'
    });
    const checkedInTickets = await Ticket.countDocuments({
      event: eventId,
      paymentStatus: 'paid',
      isUsed: true
    });
    const percentCheckedIn =
      totalTickets > 0 ? Math.round((checkedInTickets / totalTickets) * 100) : 0;
    const recentCheckIns = await Ticket.find({
      event: eventId,
      isUsed: true
    })
      .populate('user', 'name email')
      .populate('checkInInfo.scannedBy', 'name role staffDetails.staffName')
      .sort({
        checkInTime: -1
      })
      .limit(10)
      .select('ticketNumber ticketType checkInTime user checkInInfo');
    const formattedCheckIns = recentCheckIns.map(ticket => ({
      ticketNumber: ticket.ticketNumber,
      ticketType: ticket.ticketType,
      checkInTime: ticket.checkInTime,
      user: {
        name: ticket.user.name,
        email: ticket.user.email
      },
      scannedBy: ticket.checkInInfo?.scannedBy
        ? {
            name:
              ticket.checkInInfo.scannedBy.staffDetails?.staffName ||
              ticket.checkInInfo.scannedBy.name,
            role: ticket.checkInInfo.scannedBy.role
          }
        : null
    }));
    return res.status(200).json({
      success: true,
      stats: {
        totalTickets,
        checkedInTickets,
        percentCheckedIn,
        remainingTickets: totalTickets - checkedInTickets
      },
      recentCheckIns: formattedCheckIns
    });
  } catch (error) {
    logger.error('Error mendapatkan statistik check-in', {
      error: error.message
    });
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil statistik check-in'
    });
  }
};

module.exports = {
  validateTicket,
  getEventCheckInStats
};
