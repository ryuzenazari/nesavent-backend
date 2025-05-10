const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const User = require('../models/User');
const Event = require('../models/Event');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token tidak valid'
      });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token tidak ditemukan'
      });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Pengguna tidak ditemukan'
        });
      }
      req.user = user;
      req.userId = decoded.userId;
      req.userRole = user.role;
      next();
    } catch (error) {
      logger.error(`JWT verification error: ${error.message || 'Unknown error'}`);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Sesi kadaluarsa. Silakan login kembali'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
  } catch (error) {
    logger.error(`Authentication error: ${error.message || 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat autentikasi',
      error: error.message || 'Unknown error'
    });
  }
};

const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan'
      });
    }
    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Access denied for user ${req.user.email} with role ${
          req.user.role
        }, required roles: ${roles.join(', ')}`
      );
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak memiliki izin yang diperlukan'
      });
    }
    logger.info(`Access granted for user ${req.user.email} with role ${req.user.role}`);
    next();
  };
};

const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autentikasi diperlukan'
    });
  }
  if (req.user.role !== 'admin') {
    logger.warn(`Admin access denied for user ${req.user.email} with role ${req.user.role}`);
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Anda bukan admin'
    });
  }
  logger.info(`Admin access granted for user ${req.user.email}`);
  next();
};

const verifyCreator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autentikasi diperlukan'
    });
  }
  if (req.user.role !== 'creator' && req.user.role !== 'admin') {
    logger.warn(`Creator access denied for user ${req.user.email} with role ${req.user.role}`);
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Anda bukan penyelenggara event'
    });
  }
  logger.info(`Creator access granted for user ${req.user.email}`);
  next();
};

const verifyEventCreator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autentikasi diperlukan'
    });
  }
  if (
    req.user.role !== 'creator' &&
    req.user.role !== 'staff_creator' &&
    req.user.role !== 'admin'
  ) {
    logger.warn(
      `Event creator access denied for user ${req.user.email} with role ${req.user.role}`
    );
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Anda bukan penyelenggara atau staff penyelenggara event'
    });
  }
  logger.info(`Event creator access granted for user ${req.user.email}`);
  next();
};

const verifyTicketChecker = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autentikasi diperlukan'
    });
  }
  
  if (req.user.role === 'admin' || req.user.role === 'creator') {
    logger.info(`Ticket checker access granted for user ${req.user.email} with role ${req.user.role}`);
    return next();
  }
  
  if (req.user.role === 'staff_creator') {
    if (!req.user.staffDetails || !req.user.staffDetails.creatorId) {
      logger.warn(`Staff creator ${req.user.email} tidak memiliki creatorId yang valid`);
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda belum terhubung dengan creator manapun'
      });
    }
    
    const eventId = req.body.eventId;
    if (!eventId) {
      logger.warn(`Event ID tidak ditemukan dalam request staff creator ${req.user.email}`);
      return res.status(400).json({
        success: false,
        message: 'ID Event diperlukan untuk validasi tiket'
      });
    }
    
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event tidak ditemukan'
        });
      }
      
      if (event.createdBy.toString() !== req.user.staffDetails.creatorId.toString()) {
        logger.warn(
          `Staff creator ${req.user.email} mencoba memvalidasi tiket untuk event yang tidak dibuat oleh creator mereka`
        );
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak. Anda hanya dapat memvalidasi tiket untuk event dari creator yang mengundang Anda'
        });
      }
      
      logger.info(`Ticket checker access granted for staff ${req.user.email} for event ${eventId}`);
      return next();
      
    } catch (error) {
      logger.error(`Error memverifikasi staff creator: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat memverifikasi akses'
      });
    }
  }
  
  logger.warn(
    `Ticket checker access denied for user ${req.user.email} with role ${req.user.role}`
  );
  return res.status(403).json({
    success: false,
    message: 'Akses ditolak. Anda tidak memiliki izin untuk validasi tiket'
  });
};

module.exports = {
  authenticate,
  checkRole,
  verifyAdmin,
  verifyCreator,
  verifyEventCreator,
  verifyTicketChecker
};
