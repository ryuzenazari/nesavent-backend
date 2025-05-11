const { validationResult } = require('express-validator');
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Transaction = require('../models/Transaction');
const CreatorVerification = require('../models/CreatorVerification');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const adminNotificationService = require('../services/adminNotificationService');
const contentModerationService = require('../services/contentModerationService');
const promoCodeService = require('../services/promoCodeService');
const platformReportService = require('../services/platformReportService');
const userService = require('../services/userService');
const eventService = require('../services/eventService');
const paymentService = require('../services/paymentService');
const ticketService = require('../services/ticketService');

const verifyUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const { email } = req.body;
    const user = await User.findOne({
      email
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User dengan email tersebut tidak ditemukan'
      });
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    logger.info(`User ${email} diverifikasi oleh admin ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'User berhasil diverifikasi',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    logger.error(`Admin verify user error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memverifikasi user',
      error: error.message
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }
    if (user.role === 'admin' && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Tidak dapat menghapus akun admin lain'
      });
    }
    const userInfo = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    await Ticket.deleteMany({
      user: userId
    });
    await Transaction.deleteMany({
      user: userId
    });
    await User.findByIdAndDelete(userId);
    logger.info(`User ${userInfo.email} dihapus oleh admin ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'User berhasil dihapus',
      deletedUser: userInfo
    });
  } catch (error) {
    logger.error(`Admin delete user error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus user',
      error: error.message
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password -verificationToken -resetPasswordToken').sort({
      createdAt: -1
    });
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    logger.error(`Admin get all users error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar user',
      error: error.message
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId, '-password -verificationToken -resetPasswordToken');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }
    const tickets = await Ticket.find({
      user: userId
    })
      .populate({
        path: 'event',
        select: 'title date time location organizer'
      })
      .sort({
        createdAt: -1
      });
    const transactions = await Transaction.find({
      user: userId
    }).sort({
      createdAt: -1
    });
    res.status(200).json({
      success: true,
      user,
      tickets,
      transactions
    });
  } catch (error) {
    logger.error(`Admin get user by id error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil detail user',
      error: error.message
    });
  }
};

const getCreatorVerifications = async (req, res) => {
  try {
    const status = req.query.status || 'pending';

    const verifications = await CreatorVerification.find({
      status
    })
      .populate('user', 'name email profileImage')
      .sort({
        createdAt: -1
      });
    res.status(200).json({
      success: true,
      count: verifications.length,
      verifications
    });
  } catch (error) {
    logger.error(`Admin get creator verifications error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar permintaan verifikasi',
      error: error.message
    });
  }
};

const getCreatorVerificationById = async (req, res) => {
  try {
    const verificationId = req.params.id;
    const verification = await CreatorVerification.findById(verificationId).populate(
      'user',
      'name email role profileImage'
    );
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Permintaan verifikasi tidak ditemukan'
      });
    }
    res.status(200).json({
      success: true,
      verification
    });
  } catch (error) {
    logger.error(`Admin get creator verification detail error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil detail permintaan verifikasi',
      error: error.message
    });
  }
};

const approveCreatorVerification = async (req, res) => {
  try {
    const verificationId = req.params.id;
    const { adminNotes } = req.body;
    const verification = await CreatorVerification.findById(verificationId).populate('user');
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Permintaan verifikasi tidak ditemukan'
      });
    }
    if (verification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Permintaan verifikasi sudah ${verification.status}`
      });
    }
    verification.status = 'approved';
    verification.adminNotes = adminNotes || '';
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    await verification.save();
    const user = await User.findById(verification.user._id);
    user.role = 'creator';
    await user.save();
    logger.info(`Creator verification for ${user.email} approved by admin ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'Permintaan verifikasi creator berhasil disetujui',
      verification: {
        id: verification._id,
        status: verification.status,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    logger.error(`Admin approve creator verification error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menyetujui permintaan verifikasi',
      error: error.message
    });
  }
};

const rejectCreatorVerification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const verificationId = req.params.id;
    const { rejectionReason, adminNotes } = req.body;
    const verification = await CreatorVerification.findById(verificationId).populate('user');
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Permintaan verifikasi tidak ditemukan'
      });
    }
    if (verification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Permintaan verifikasi sudah ${verification.status}`
      });
    }
    verification.status = 'rejected';
    verification.rejectionReason = rejectionReason;
    verification.adminNotes = adminNotes || '';
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    await verification.save();
    logger.info(
      `Creator verification for ${verification.user.email} rejected by admin ${req.user.email}`
    );
    res.status(200).json({
      success: true,
      message: 'Permintaan verifikasi creator ditolak',
      verification: {
        id: verification._id,
        status: verification.status,
        rejectionReason
      }
    });
  } catch (error) {
    logger.error(`Admin reject creator verification error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menolak permintaan verifikasi',
      error: error.message
    });
  }
};

// Dashboard
const getDashboardStats = async (req, res) => {
  try {
    // Get admin ID
    const adminId = req.user.id;
    
    // Get notification counts for the admin
    const notificationCounts = await adminNotificationService.getUnreadNotificationCount(adminId);
    
    // Get moderation stats
    const moderationStats = await contentModerationService.getContentModerationStats();
    
    // Get promo code stats
    const promoCodeStats = await promoCodeService.getPromoCodeStats();
    
    // Get recent platform activity
    // This would be implemented to fetch recent important activities
    const recentActivity = [];
    
    // Get system status (placeholder for actual implementation)
    const systemStatus = {
      serverStatus: 'operational',
      databaseStatus: 'operational',
      paymentGatewayStatus: 'operational',
      storageStatus: 'operational',
      lastChecked: new Date()
    };
    
    res.status(200).json({
      notificationCounts,
      moderationStats,
      promoCodeStats,
      recentActivity,
      systemStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Notifications
const getNotifications = async (req, res) => {
  try {
    const adminId = req.user.id;
    
    const filters = {
      type: req.query.type,
      priority: req.query.priority,
      read: req.query.read === 'true' ? true : (req.query.read === 'false' ? false : undefined),
      actionRequired: req.query.actionRequired === 'true' ? true : (req.query.actionRequired === 'false' ? false : undefined),
      adminId
    };
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await adminNotificationService.getNotifications(filters, page, limit);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const adminId = req.user.id;
    
    const result = await adminNotificationService.markAsRead(notificationId, adminId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const adminId = req.user.id;
    const filters = {
      type: req.query.type,
      priority: req.query.priority
    };
    
    const result = await adminNotificationService.markAllAsRead(adminId, filters);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markNotificationActionTaken = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const adminId = req.user.id;
    const { notes } = req.body;
    
    const result = await adminNotificationService.markActionTaken(notificationId, adminId, notes);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Content Moderation
const getModerationCases = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      contentType: req.query.contentType,
      severity: req.query.severity
    };
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await contentModerationService.getModerationCases(filters, page, limit);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getModerationCase = async (req, res) => {
  try {
    const { caseId } = req.params;
    
    const result = await contentModerationService.getModerationCase(caseId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const moderateContent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { caseId } = req.params;
    const adminId = req.user.id;
    const { action, notes } = req.body;
    
    const result = await contentModerationService.moderateContent(caseId, adminId, action, notes);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Promo Codes
const createPromoCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const adminId = req.user.id;
    const promoCodeData = {
      ...req.body,
      createdBy: adminId
    };
    
    const result = await promoCodeService.createPromoCode(promoCodeData);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPromoCodes = async (req, res) => {
  try {
    const filters = {
      isActive: req.query.isActive === 'true' ? true : (req.query.isActive === 'false' ? false : undefined),
      type: req.query.type,
      search: req.query.search,
      valid: req.query.valid === 'true',
      expired: req.query.expired === 'true'
    };
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await promoCodeService.getPromoCodes(filters, page, limit);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPromoCodeById = async (req, res) => {
  try {
    const { promoCodeId } = req.params;
    
    const result = await promoCodeService.getPromoCodeById(promoCodeId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePromoCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { promoCodeId } = req.params;
    const adminId = req.user.id;
    const updateData = req.body;
    
    const result = await promoCodeService.updatePromoCode(promoCodeId, updateData, adminId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePromoCode = async (req, res) => {
  try {
    const { promoCodeId } = req.params;
    
    const result = await promoCodeService.deletePromoCode(promoCodeId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const togglePromoCodeStatus = async (req, res) => {
  try {
    const { promoCodeId } = req.params;
    const adminId = req.user.id;
    const { isActive } = req.body;
    
    if (isActive === undefined) {
      return res.status(400).json({ message: 'isActive field is required' });
    }
    
    const result = await promoCodeService.togglePromoCodeStatus(promoCodeId, isActive, adminId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Platform Reports
const generateReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const adminId = req.user.id;
    const reportData = {
      ...req.body,
      adminId
    };
    
    const result = await platformReportService.generateReport(reportData);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReports = async (req, res) => {
  try {
    const filters = {
      reportType: req.query.reportType,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await platformReportService.getReports(filters, page, limit);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    const adminId = req.user.id;
    
    const result = await platformReportService.getReportById(reportId);
    
    // Mark as viewed automatically
    await platformReportService.markReportAsViewed(reportId, adminId);
    
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const publishReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const adminId = req.user.id;
    
    const result = await platformReportService.publishReport(reportId, adminId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const result = await platformReportService.deleteReport(reportId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.status(200).json({ success: true, isActive: user.isActive, message: 'Status user berhasil diubah' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengubah status user', error: error.message });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: events.length, events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengambil daftar event', error: error.message });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event tidak ditemukan' });
    }
    res.status(200).json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengambil detail event', error: error.message });
  }
};

const updateEventStatus = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event tidak ditemukan' });
    }
    event.status = req.body.status;
    await event.save();
    res.status(200).json({ success: true, status: event.status, message: 'Status event berhasil diubah' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengubah status event', error: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event tidak ditemukan' });
    }
    res.status(200).json({ success: true, message: 'Event berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menghapus event', error: error.message });
  }
};

const getPendingVerifications = async (req, res) => {
  try {
    const verifications = await CreatorVerification.find({ status: 'pending' })
      .populate('user', 'name email role profileImage')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: verifications.length, verifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengambil daftar verifikasi', error: error.message });
  }
};

const approveVerification = async (req, res) => {
  try {
    const verification = await CreatorVerification.findById(req.params.verificationId).populate('user');
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verifikasi tidak ditemukan' });
    }
    if (verification.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Verifikasi sudah ${verification.status}` });
    }
    verification.status = 'approved';
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    await verification.save();
    verification.user.role = 'creator';
    await verification.user.save();
    res.status(200).json({ success: true, message: 'Verifikasi berhasil disetujui', verification });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menyetujui verifikasi', error: error.message });
  }
};

const rejectVerification = async (req, res) => {
  try {
    const verification = await CreatorVerification.findById(req.params.verificationId).populate('user');
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verifikasi tidak ditemukan' });
    }
    if (verification.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Verifikasi sudah ${verification.status}` });
    }
    verification.status = 'rejected';
    verification.rejectionReason = req.body.reason;
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    await verification.save();
    res.status(200).json({ success: true, message: 'Verifikasi berhasil ditolak', verification });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menolak verifikasi', error: error.message });
  }
};

module.exports = {
  // Dashboard
  getDashboardStats,
  
  // Notifications
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markNotificationActionTaken,
  
  // Content Moderation
  getModerationCases,
  getModerationCase,
  moderateContent,
  
  // Promo Codes
  createPromoCode,
  getPromoCodes,
  getPromoCodeById,
  updatePromoCode,
  deletePromoCode,
  togglePromoCodeStatus,
  
  // Platform Reports
  generateReport,
  getReports,
  getReportById,
  publishReport,
  deleteReport,
  
  // User Management
  getAllUsers,
  getUserById,
  toggleUserStatus,
  deleteUser,
  
  // Event Management
  getAllEvents,
  getEventById,
  updateEventStatus,
  deleteEvent,
  
  // Verification
  getPendingVerifications,
  approveVerification,
  rejectVerification
};
