const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Akses ditolak, token tidak ditemukan' });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak, format token tidak valid' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token tidak valid' });
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

module.exports = {
  authenticateJWT,
  isAdmin,
  isCreator,
  isAdminOrCreator,
  isStaff,
  isOwnerOrAdmin,
  checkActivityLimit
}; 