const { logger } = require('../utils/logger');
const getNotifications = async (req, res) => {
  res.status(200).json({
    success: true,
    notifications: [],
    total: 0,
    page: 1,
    limit: 10
  });
};
const markAsRead = async (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Notifikasi tidak ditemukan'
  });
};
const markAllAsRead = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Semua notifikasi ditandai sebagai telah dibaca (dummy)'
  });
};
module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
