const PlatformReport = require('../models/PlatformReport');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Membuat laporan platform baru
 */
const generateReport = async (reportData) => {
  try {
    const { reportType, startDate, endDate, createdBy } = reportData;
    
    // Validasi tanggal
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error('Tanggal mulai tidak boleh lebih baru dari tanggal akhir');
    }
    
    // Mendapatkan data statistik platform
    const reportContent = await collectReportData(startDate, endDate);
    
    const report = new PlatformReport({
      reportType,
      startDate,
      endDate,
      content: reportContent,
      createdBy
    });
    
    await report.save();
    return report;
  } catch (error) {
    logger.error('Error generating platform report:', error);
    throw error;
  }
};

/**
 * Mengumpulkan data untuk membentuk laporan
 */
const collectReportData = async (startDate, endDate) => {
  try {
    const dateRange = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
    
    // User statistics
    const newUsersCount = await User.countDocuments({
      createdAt: dateRange
    });
    
    const usersByRole = await User.aggregate([
      { $match: { createdAt: dateRange } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    // Event statistics
    const newEventsCount = await Event.countDocuments({
      createdAt: dateRange
    });
    
    const eventsByStatus = await Event.aggregate([
      { $match: { createdAt: dateRange } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const eventsByCategory = await Event.aggregate([
      { $match: { createdAt: dateRange } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    // Ticket statistics
    const ticketsSold = await Ticket.countDocuments({
      createdAt: dateRange,
      paymentStatus: 'paid'
    });
    
    const ticketsSoldByType = await Ticket.aggregate([
      { 
        $match: { 
          createdAt: dateRange,
          paymentStatus: 'paid'
        } 
      },
      { $group: { _id: '$ticketType', count: { $sum: 1 } } }
    ]);
    
    // Revenue statistics
    const revenue = await Transaction.aggregate([
      { 
        $match: { 
          createdAt: dateRange,
          paymentStatus: 'completed'
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const revenueByDay = await Transaction.aggregate([
      { 
        $match: { 
          createdAt: dateRange,
          paymentStatus: 'completed'
        } 
      },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    return {
      userStats: {
        newUsers: newUsersCount,
        usersByRole: usersByRole.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      },
      eventStats: {
        newEvents: newEventsCount,
        eventsByStatus: eventsByStatus.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        eventsByCategory: eventsByCategory.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      },
      ticketStats: {
        ticketsSold,
        ticketsByType: ticketsSoldByType.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      },
      revenueStats: {
        totalRevenue: revenue.length > 0 ? revenue[0].total : 0,
        revenueByDay: revenueByDay.map(day => ({
          date: `${day._id.year}-${day._id.month}-${day._id.day}`,
          amount: day.total
        }))
      }
    };
  } catch (error) {
    logger.error('Error collecting report data:', error);
    throw error;
  }
};

/**
 * Mendapatkan semua laporan
 */
const getReports = async (filter = {}, options = {}) => {
  try {
    const reports = await PlatformReport.find(filter)
      .populate('createdBy', 'name email')
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50);
    
    return reports;
  } catch (error) {
    logger.error('Error getting platform reports:', error);
    throw error;
  }
};

/**
 * Mendapatkan laporan berdasarkan ID
 */
const getReportById = async (reportId) => {
  try {
    const report = await PlatformReport.findById(reportId)
      .populate('createdBy', 'name email');
    
    if (!report) {
      throw new Error('Report not found');
    }
    
    return report;
  } catch (error) {
    logger.error(`Error getting report by ID ${reportId}:`, error);
    throw error;
  }
};

/**
 * Mempublikasikan laporan
 */
const publishReport = async (reportId) => {
  try {
    const report = await PlatformReport.findByIdAndUpdate(
      reportId,
      { 
        isPublished: true,
        publishedAt: new Date()
      },
      { new: true }
    );
    
    if (!report) {
      throw new Error('Report not found');
    }
    
    return report;
  } catch (error) {
    logger.error(`Error publishing report ${reportId}:`, error);
    throw error;
  }
};

/**
 * Menghapus laporan
 */
const deleteReport = async (reportId) => {
  try {
    const result = await PlatformReport.findByIdAndDelete(reportId);
    if (!result) {
      throw new Error('Report not found');
    }
    return result;
  } catch (error) {
    logger.error(`Error deleting report ${reportId}:`, error);
    throw error;
  }
};

module.exports = {
  generateReport,
  getReports,
  getReportById,
  publishReport,
  deleteReport
}; 