const { validationResult } = require('express-validator');
const User = require('../models/User');
const CreatorVerification = require('../models/CreatorVerification');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const Event = require('../models/Event');
const { sendEmail } = require('../utils/emailSender');
const creatorDashboardService = require('../services/creatorDashboardService');
const eventTemplateService = require('../services/eventTemplateService');
const payoutService = require('../services/payoutService');
const multiEventService = require('../services/multiEventService');

exports.submitVerification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const { organizationName, organizationType, phoneNumber, description } = req.body;
    const existingRequest = await CreatorVerification.findOne({
      user: req.user._id,
      status: 'pending'
    });
    if (existingRequest) {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Anda sudah memiliki permintaan verifikasi yang sedang diproses'
      });
    }
    if (req.user.role === 'creator' || req.user.role === 'staff_creator') {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Anda sudah terdaftar sebagai creator/staff creator'
      });
    }
    const documentPaths = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        documentPaths.push(`/uploads/documents/${file.filename}`);
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Minimal satu dokumen harus diunggah'
      });
    }
    const newVerification = new CreatorVerification({
      user: req.user._id,
      organizationName,
      organizationType,
      phoneNumber,
      description,
      documents: documentPaths
    });
    await newVerification.save();
    logger.info(`User ${req.user.email} submitted creator verification request`);
    res.status(201).json({
      success: true,
      message:
        'Permintaan verifikasi creator berhasil dikirim dan sedang menunggu persetujuan admin',
      verification: {
        id: newVerification._id,
        status: newVerification.status,
        createdAt: newVerification.createdAt
      }
    });
  } catch (error) {
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    logger.error(`Creator verification error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses permintaan verifikasi',
      error: error.message
    });
  }
};

exports.getVerificationStatus = async (req, res) => {
  try {
    const verifications = await CreatorVerification.find({
      user: req.user._id
    }).sort({
      createdAt: -1
    });
    res.status(200).json({
      success: true,
      verifications
    });
  } catch (error) {
    logger.error(`Get creator verification status error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil status verifikasi',
      error: error.message
    });
  }
};

exports.addStaffCreator = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const { userId, email, staffName } = req.body;
    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({
        email
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'User ID atau email harus disediakan'
      });
    }
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }
    if (user.role === 'creator' || user.role === 'staff_creator' || user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: `User sudah memiliki role ${user.role}`
      });
    }
    user.role = 'staff_creator';
    if (staffName) {
      user.staffDetails = {
        addedBy: req.user._id,
        addedAt: new Date(),
        staffName: staffName
      };
    } else {
      user.staffDetails = {
        addedBy: req.user._id,
        addedAt: new Date()
      };
    }
    await user.save();
    logger.info(`User ${user.email} has been added as staff creator by ${req.user.email}`);
    res.status(200).json({
      success: true,
      message:
        'Staff creator berhasil ditambahkan. Staff hanya dapat melakukan scan QR code tiket.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        staffDetails: user.staffDetails
      }
    });
  } catch (error) {
    logger.error(`Add staff creator error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan staff creator',
      error: error.message
    });
  }
};

exports.inviteStaff = async (req, res) => {
  try {
    const creatorId = req.user._id;
    const { email, staffName, permissions } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email staff diperlukan'
      });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna dengan email tersebut tidak ditemukan. Staff harus terdaftar terlebih dahulu sebagai user biasa.'
      });
    }

    if (user.role === 'staff_creator' && user.staffDetails && user.staffDetails.creatorId) {
      const existingCreator = await User.findById(user.staffDetails.creatorId);
      
      if (existingCreator && existingCreator._id.toString() !== creatorId.toString()) {
        return res.status(400).json({
          success: false,
          message: `Pengguna ini sudah menjadi staff untuk creator: ${existingCreator.name}`
        });
      }
    }

    user.role = 'staff_creator';
    user.staffDetails = {
      addedBy: creatorId,
      creatorId: creatorId,
      addedAt: new Date(),
      staffName: staffName || user.name,
      permissions: {
        scanTickets: permissions?.scanTickets !== undefined ? permissions.scanTickets : true,
        viewAttendees: permissions?.viewAttendees !== undefined ? permissions.viewAttendees : false,
        viewStats: permissions?.viewStats !== undefined ? permissions.viewStats : false
      }
    };

    await user.save();

    const creator = await User.findById(creatorId);
    
    await sendEmail({
      to: user.email,
      subject: 'Undangan Menjadi Staff Creator di NesaVent',
      template: 'staff-invitation',
      data: {
        staffName: staffName || user.name,
        creatorName: creator.name,
        loginLink: `${process.env.FRONTEND_URL}/login`,
        platformName: 'NesaVent'
      }
    });

    logger.info(`User ${user.email} diundang sebagai staff oleh creator ${creator.email}`);

    return res.status(200).json({
      success: true,
      message: `Berhasil mengundang ${user.email} sebagai staff`,
      data: {
        staffId: user._id,
        staffEmail: user.email,
        staffName: user.staffDetails.staffName
      }
    });
  } catch (error) {
    logger.error(`Error saat mengundang staff: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengundang staff',
      error: error.message
    });
  }
};

exports.getMyStaff = async (req, res) => {
  try {
    const creatorId = req.user._id;
    
    const staffList = await User.find({
      role: 'staff_creator',
      'staffDetails.creatorId': creatorId
    }).select('_id name email staffDetails.staffName staffDetails.addedAt staffDetails.permissions');

    return res.status(200).json({
      success: true,
      data: staffList
    });
  } catch (error) {
    logger.error(`Error saat mengambil daftar staff: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar staff',
      error: error.message
    });
  }
};

exports.updateStaffPermissions = async (req, res) => {
  try {
    const creatorId = req.user._id;
    const { staffId } = req.params;
    const { permissions, staffName } = req.body;

    const staff = await User.findOne({
      _id: staffId,
      role: 'staff_creator',
      'staffDetails.creatorId': creatorId
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff tidak ditemukan atau bukan staff Anda'
      });
    }

    if (permissions) {
      staff.staffDetails.permissions = {
        ...staff.staffDetails.permissions,
        ...permissions
      };
    }

    if (staffName) {
      staff.staffDetails.staffName = staffName;
    }

    await staff.save();

    logger.info(`Permissions untuk staff ${staffId} diperbarui oleh creator ${creatorId}`);

    return res.status(200).json({
      success: true,
      message: 'Izin staff berhasil diperbarui',
      data: {
        staffId: staff._id,
        staffName: staff.staffDetails.staffName,
        permissions: staff.staffDetails.permissions
      }
    });
  } catch (error) {
    logger.error(`Error saat memperbarui izin staff: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui izin staff',
      error: error.message
    });
  }
};

exports.removeStaff = async (req, res) => {
  try {
    const creatorId = req.user._id;
    const { staffId } = req.params;

    const staff = await User.findOne({
      _id: staffId,
      role: 'staff_creator',
      'staffDetails.creatorId': creatorId
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff tidak ditemukan atau bukan staff Anda'
      });
    }

    staff.role = 'user';
    staff.staffDetails = undefined;
    await staff.save();

    logger.info(`Staff ${staffId} dihapus oleh creator ${creatorId}`);

    const creator = await User.findById(creatorId);
    
    await sendEmail({
      to: staff.email,
      subject: 'Perubahan Status Staff di NesaVent',
      template: 'staff-removal',
      data: {
        staffName: staff.name,
        creatorName: creator.name,
        platformName: 'NesaVent'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Staff berhasil dihapus'
    });
  } catch (error) {
    logger.error(`Error saat menghapus staff: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus staff',
      error: error.message
    });
  }
};

const getDashboard = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const dashboard = await creatorDashboardService.getCreatorDashboard(creatorId);
    res.status(200).json(dashboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEventStatistics = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const eventId = req.params.eventId;
    const statistics = await creatorDashboardService.getEventStatistics(creatorId, eventId);
    res.status(200).json(statistics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createEventTemplate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const creatorId = req.user.id;
    const templateData = req.body;
    
    const template = await eventTemplateService.createTemplate(creatorId, templateData);
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEventTemplates = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const filter = {
      category: req.query.category,
      isPublic: req.query.isPublic !== undefined ? req.query.isPublic === 'true' : undefined
    };
    
    const templates = await eventTemplateService.getTemplates(creatorId, filter);
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEventTemplateById = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const templateId = req.params.templateId;
    
    const template = await eventTemplateService.getTemplateById(creatorId, templateId);
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateEventTemplate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const creatorId = req.user.id;
    const templateId = req.params.templateId;
    const updateData = req.body;
    
    const template = await eventTemplateService.updateTemplate(creatorId, templateId, updateData);
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteEventTemplate = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const templateId = req.params.templateId;
    
    const result = await eventTemplateService.deleteTemplate(creatorId, templateId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createEventFromTemplate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const creatorId = req.user.id;
    const templateId = req.params.templateId;
    const eventData = req.body;
    
    const event = await eventTemplateService.createEventFromTemplate(creatorId, templateId, eventData);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPublicTemplates = async (req, res) => {
  try {
    const category = req.query.category;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    const templates = await eventTemplateService.getPublicTemplates(category, limit);
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPendingPayout = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const pendingPayout = await payoutService.calculatePendingPayout(creatorId);
    res.status(200).json(pendingPayout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const requestPayout = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const creatorId = req.user.id;
    const paymentData = {
      creatorId,
      paymentMethod: req.body.paymentMethod,
      bankDetails: req.body.bankDetails,
      eWalletDetails: req.body.eWalletDetails,
      paypalDetails: req.body.paypalDetails,
      otherPaymentDetails: req.body.otherPaymentDetails
    };
    
    const payout = await payoutService.createPayout(paymentData);
    res.status(201).json(payout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPayouts = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const status = req.query.status;
    
    const payouts = await payoutService.getPayouts(creatorId, status);
    res.status(200).json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPayoutById = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const payoutId = req.params.payoutId;
    
    const payout = await payoutService.getPayoutById(creatorId, payoutId);
    res.status(200).json(payout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const cancelPayout = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const payoutId = req.params.payoutId;
    const reason = req.body.reason;
    
    const result = await payoutService.cancelPayout(creatorId, payoutId, reason);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPayoutSummary = async (req, res) => {
  try {
    const creatorId = req.user.id;
    
    const summary = await payoutService.getPayoutSummary(creatorId);
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCreatorEvents = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const filters = {
      status: req.query.status,
      category: req.query.category,
      timeframe: req.query.timeframe,
      search: req.query.search,
      sort: req.query.sort,
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : null
    };
    
    const events = await multiEventService.getCreatorEvents(creatorId, filters);
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkUpdateEventStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const creatorId = req.user.id;
    const { eventIds, status } = req.body;
    
    const result = await multiEventService.bulkUpdateEventStatus(creatorId, eventIds, status);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const duplicateEvent = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const eventId = req.params.eventId;
    const overrideData = req.body;
    
    const event = await multiEventService.duplicateEvent(creatorId, eventId, overrideData);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkExportEventData = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const eventIds = req.body.eventIds;
    
    const exportData = await multiEventService.bulkExportEventData(creatorId, eventIds);
    res.status(200).json(exportData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkDeleteEvents = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const eventIds = req.body.eventIds;
    
    const result = await multiEventService.bulkDeleteEvents(creatorId, eventIds);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getBulkEventStatistics = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const timeframe = req.query.timeframe || '30days';
    
    const statistics = await multiEventService.getBulkEventStatistics(creatorId, timeframe);
    res.status(200).json(statistics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCreatorsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Validasi tipe organisasi
    const validTypes = [
      'himpunan', 'ukm', 'bem', 'fakultas', 'departemen', 
      'komunitas', 'kepanitiaan', 'eksternal', 'startup', 
      'paguyuban', 'studyclub', 'lainnya'
    ];

    if (type !== 'all' && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe organisasi tidak valid'
      });
    }

    // Dapatkan ID creator yang telah diverifikasi dengan tipe organisasi tertentu
    const verifications = await CreatorVerification.find({
      status: 'approved',
      ...(type !== 'all' && { organizationType: type })
    }).select('user organizationName organizationType').populate('user', 'name email profileImage');

    const userIds = verifications.map(v => v.user._id);

    // Dapatkan informasi tambahan seperti jumlah event, rating, dll
    const aggregationPipeline = [
      { $match: { creator: { $in: userIds } } },
      { $group: { 
        _id: '$creator', 
        eventCount: { $sum: 1 },
        avgRating: { $avg: '$rating' },
        upcomingEvents: { 
          $sum: { 
            $cond: [
              { $gt: ['$eventDate', new Date()] }, 
              1, 
              0
            ] 
          } 
        }
      }}
    ];

    const eventStats = await Event.aggregate(aggregationPipeline);
    
    // Map statistics ke creators
    const creatorsWithStats = verifications.map(verification => {
      const stats = eventStats.find(stat => 
        stat._id.toString() === verification.user._id.toString()
      ) || { eventCount: 0, avgRating: 0, upcomingEvents: 0 };
      
      return {
        id: verification.user._id,
        name: verification.user.name,
        email: verification.user.email,
        profileImage: verification.user.profileImage,
        organizationName: verification.organizationName,
        organizationType: verification.organizationType,
        eventCount: stats.eventCount || 0,
        avgRating: stats.avgRating || 0,
        upcomingEvents: stats.upcomingEvents || 0
      };
    });

    // Pagination
    const total = creatorsWithStats.length;
    const paginatedCreators = creatorsWithStats.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      creators: paginatedCreators,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Get creators by type error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mencari creator berdasarkan tipe',
      error: error.message
    });
  }
};

module.exports = {
  getDashboard,
  getEventStatistics,
  createEventTemplate,
  getEventTemplates,
  getEventTemplateById,
  updateEventTemplate,
  deleteEventTemplate,
  createEventFromTemplate,
  getPublicTemplates,
  getPendingPayout,
  requestPayout,
  getPayouts,
  getPayoutById,
  cancelPayout,
  getPayoutSummary,
  getCreatorEvents,
  bulkUpdateEventStatus,
  duplicateEvent,
  bulkExportEventData,
  bulkDeleteEvents,
  getBulkEventStatistics,
  getCreatorsByType
};
