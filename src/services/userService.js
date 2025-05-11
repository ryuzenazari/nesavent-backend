const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Mencari semua pengguna dengan filter opsional
 */
const getAllUsers = async (filter = {}, options = {}) => {
  try {
    const users = await User.find(filter, options.projection || {})
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50);
    
    return users;
  } catch (error) {
    logger.error('Error getting all users:', error);
    throw error;
  }
};

/**
 * Mencari pengguna berdasarkan ID
 */
const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Pengguna tidak ditemukan');
    }
    return user;
  } catch (error) {
    logger.error(`Error getting user by ID ${userId}:`, error);
    throw error;
  }
};

/**
 * Memperbarui status pengguna (aktif/nonaktif)
 */
const toggleUserStatus = async (userId, isActive) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId, 
      { isActive },
      { new: true }
    );
    
    if (!user) {
      throw new Error('Pengguna tidak ditemukan');
    }
    
    return user;
  } catch (error) {
    logger.error(`Error toggling user status for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Menghapus pengguna
 */
const deleteUser = async (userId) => {
  try {
    const result = await User.findByIdAndDelete(userId);
    if (!result) {
      throw new Error('Pengguna tidak ditemukan');
    }
    return result;
  } catch (error) {
    logger.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  toggleUserStatus,
  deleteUser
}; 