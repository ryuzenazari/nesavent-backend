const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const User = require('../models/User');
const Event = require('../models/Event');

const authenticate = async (req, res, next) => {
  try {
    // Cek berbagai kemungkinan header token
    let token = null;
    const authHeader = req.headers.authorization;
    const xAccessToken = req.headers['x-access-token'];
    
    // Cek header Authorization dengan format Bearer
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        // Format standard: "Bearer [token]"
        token = authHeader.split(' ')[1];
      } else if (authHeader.startsWith('Bearer')) {
        // Format tanpa spasi: "Bearer[token]"
        token = authHeader.substring(6);
      } else {
        // Format hanya token: "[token]"
        token = authHeader;
      }
    } 
    // Cek header x-access-token sebagai alternatif
    else if (xAccessToken) {
      token = xAccessToken;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token tidak ditemukan'
      });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Log token untuk debugging
      logger.debug('JWT token decoded:', { 
        id: decoded.id,
        userId: decoded.userId,
        iat: decoded.iat,
        exp: decoded.exp 
      });
      
      // Coba cari user dengan id atau userId (untuk mendukung kedua format)
      const userId = decoded.id || decoded.userId;
      if (!userId) {
        logger.error('Token tidak memiliki id atau userId');
        return res.status(401).json({
          success: false,
          message: 'Token tidak valid (tidak ada ID)'
        });
      }
      
      // Cari user dengan ID yang benar
      const user = await User.findById(userId);
      if (!user) {
        logger.error(`User tidak ditemukan dengan ID: ${userId}`);
        return res.status(401).json({
          success: false,
          message: 'Pengguna tidak ditemukan'
        });
      }
      
      req.user = user;
      req.userId = userId;
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

const verifyTicketChecker = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autentikasi diperlukan'
    });
  }
  if (req.user.role !== 'ticket_checker' && req.user.role !== 'admin') {
    logger.warn(`Ticket checker access denied for user ${req.user.email} with role ${req.user.role}`);
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Anda bukan petugas check-in'
    });
  }
  logger.info(`Ticket checker access granted for user ${req.user.email}`);
  next();
};

// Fungsi untuk mengizinkan akses berdasarkan peran tertentu
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Access denied for user ${req.user.email} with role ${req.user.role}, required roles: ${roles.join(', ')}`
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

module.exports = {
  authenticate,
  checkRole,
  verifyAdmin,
  verifyCreator,
  verifyEventCreator,
  verifyTicketChecker,
  authorize
};
