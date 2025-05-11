const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Middleware untuk memeriksa apakah pengguna memiliki role admin
 */
const verifyAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Anda harus login terlebih dahulu.'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan'
      });
    }
    
    if (user.role !== 'admin') {
      logger.warn(`Akses admin ditolak untuk user: ${userId}`);
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda harus memiliki role admin.'
      });
    }
    
    // Jika pengguna adalah admin, lanjutkan ke next middleware
    next();
  } catch (error) {
    logger.error(`Error pada adminMiddleware: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
};

module.exports = verifyAdmin; 