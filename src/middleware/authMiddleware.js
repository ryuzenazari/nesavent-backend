const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Middleware untuk verifikasi token JWT
const authenticateJWT = async (req, res, next) => {
  try {
    // Ekstrak token dari header Authorization
    const authHeader = req.headers.authorization;
    let token;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Format: "Bearer token"
      token = authHeader.split(' ')[1];
    } else if (authHeader) {
      // Format: "token" (tanpa Bearer)
      token = authHeader;
    } else if (req.cookies && req.cookies.token) {
      // Format: Cookie
      token = req.cookies.token;
    }

    // Jika token tidak ada
    if (!token) {
      return res.status(401).json({
        success: false, 
        message: 'Akses ditolak. Token tidak ditemukan'
      });
    }

    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Untuk mendukung token format lama dan baru
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Format token tidak valid' 
      });
    }
    
    // Cari user berdasarkan ID yang didapat dari token
    const user = await User.findById(userId).select('-password');
    
    // Jika user tidak ditemukan
    if (!user) {
      return res.status(401).json({
        success: false, 
        message: 'Akses ditolak. User tidak ditemukan'
      });
    }

    // Tambahkan informasi user ke request
    req.user = {
      id: user._id,
      _id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    };
    
    // Untuk kompatibilitas dengan kode lama
    req.userId = user._id;
    
    // Lanjutkan ke handler selanjutnya
    next();
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false, 
        message: 'Akses ditolak. Token tidak valid'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false, 
        message: 'Akses ditolak. Token sudah kadaluarsa'
      });
    }
    
    res.status(500).json({
      success: false, 
      message: 'Terjadi kesalahan pada server'
    });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Akses ditolak, hanya admin yang bisa mengakses' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

const isCreator = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }
    
    if (user.role !== 'creator' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Akses ditolak, hanya creator yang bisa mengakses' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

const isAdminOrCreator = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }
    
    if (user.role !== 'admin' && user.role !== 'creator') {
      return res.status(403).json({ message: 'Akses ditolak, hanya admin atau creator yang bisa mengakses' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

const isStaff = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }
    
    if (user.role !== 'staff' && user.role !== 'admin' && user.role !== 'creator') {
      return res.status(403).json({ message: 'Akses ditolak, hanya staff yang bisa mengakses' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

const isOwnerOrAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }
    
    // If the user is an admin, allow access
    if (user.role === 'admin') {
      return next();
    }
    
    // For resources that have a userId field
    if (req.params.userId && req.params.userId !== userId) {
      return res.status(403).json({ message: 'Akses ditolak, bukan pemilik atau admin' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

const checkActivityLimit = async (req, res, next) => {
  // This middleware would be implemented to check user activity limits
  // For example, limiting the number of actions in a time period
  next();
};

/**
 * Middleware untuk mengizinkan hanya role tertentu yang bisa akses
 * @param {Array} roles - Array berisi role yang diizinkan
 * @returns {Function} - Express middleware
 */
const authorizeRole = (roles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id || req.user.userId;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
      }
      
      if (!roles.includes(user.role)) {
        return res.status(403).json({ 
          message: `Akses ditolak, hanya ${roles.join(', ')} yang bisa mengakses`,
          requiredRoles: roles,
          yourRole: user.role
        });
      }
      
      // Set user object di req
      req.user = { ...req.user, _id: user._id, role: user.role };
      
      next();
    } catch (error) {
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
};

// Export dalam bentuk objek authMiddleware untuk kompatibilitas dengan kode yang ada
module.exports = {
  authenticateJWT,
  isAdmin,
  isCreator,
  isAdminOrCreator,
  isStaff,
  isOwnerOrAdmin,
  checkActivityLimit,
  authorizeRole,
  // Untuk kompatibilitas dengan kode yang menggunakan authMiddleware.authenticateJWT
  authMiddleware: {
    authenticateJWT
  }
}; 