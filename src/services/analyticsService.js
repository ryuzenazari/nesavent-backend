const Analytics = require('../models/Analytics');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Transaction = require('../models/Transaction');
const { logger } = require('../utils/logger');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const trackEventView = async (eventId, userId = null) => {
  try {
    let analytics = await Analytics.findOne({ eventId });
    
    if (!analytics) {
      analytics = new Analytics({
        eventId,
        metrics: {
          views: 1,
          uniqueVisitors: userId ? 1 : 0,
          ticketsSold: 0,
          totalRevenue: 0,
          conversionRate: 0
        },
        visitors: userId ? [userId] : []
      });
    } else {
      analytics.metrics.views += 1;
      
      if (userId && !analytics.visitors.includes(userId)) {
        analytics.visitors.push(userId);
        analytics.metrics.uniqueVisitors += 1;
      }
    }
    
    await analytics.save();
    logger.info(`Tracked view for event: ${eventId}`);
    return analytics;
  } catch (error) {
    logger.error(`Track event view error: ${error.message}`);
    throw error;
  }
};

const trackTicketSale = async (eventId, ticketId, amount) => {
  try {
    let analytics = await Analytics.findOne({ eventId });
    
    if (!analytics) {
      analytics = new Analytics({
        eventId,
        metrics: {
          views: 0,
          uniqueVisitors: 0,
          ticketsSold: 1,
          totalRevenue: amount,
          conversionRate: 0
        },
        soldTickets: [ticketId]
      });
    } else {
      analytics.metrics.ticketsSold += 1;
      analytics.metrics.totalRevenue += amount;
      
      if (!analytics.soldTickets) {
        analytics.soldTickets = [];
      }
      
      analytics.soldTickets.push(ticketId);
      
      if (analytics.metrics.views > 0) {
        analytics.metrics.conversionRate = (analytics.metrics.ticketsSold / analytics.metrics.views) * 100;
      }
    }
    
    await analytics.save();
    logger.info(`Tracked ticket sale for event: ${eventId}, ticket: ${ticketId}, amount: ${amount}`);
    return analytics;
  } catch (error) {
    logger.error(`Track ticket sale error: ${error.message}`);
    throw error;
  }
};

const getEventSalesReport = async (eventId, startDate, endDate) => {
  try {
    const analytics = await Analytics.findOne({
      eventId
    });
    if (!analytics) {
      throw new Error('Analytics tidak ditemukan');
    }
    const transactions = await Transaction.find({
      eventId,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('tickets');
    const report = {
      eventId,
      totalSales: transactions.length,
      totalRevenue: transactions.reduce((sum, t) => sum + t.amount, 0),
      ticketTypes: {},
      dailySales: {},
      paymentMethods: {}
    };
    transactions.forEach(transaction => {
      transaction.tickets.forEach(ticket => {
        const type = ticket.ticketType;
        if (!report.ticketTypes[type]) {
          report.ticketTypes[type] = {
            sold: 0,
            revenue: 0
          };
        }
        report.ticketTypes[type].sold++;
        report.ticketTypes[type].revenue += ticket.price;
      });
      const date = transaction.createdAt.toISOString().split('T')[0];
      if (!report.dailySales[date]) {
        report.dailySales[date] = {
          sales: 0,
          revenue: 0
        };
      }
      report.dailySales[date].sales++;
      report.dailySales[date].revenue += transaction.amount;
      const method = transaction.paymentMethod;
      if (!report.paymentMethods[method]) {
        report.paymentMethods[method] = {
          count: 0,
          amount: 0
        };
      }
      report.paymentMethods[method].count++;
      report.paymentMethods[method].amount += transaction.amount;
    });
    return report;
  } catch (error) {
    logger.error(`Get event sales report error: ${error.message}`);
    throw error;
  }
};

const getPlatformGrowthAnalysis = async (period = 'monthly') => {
  try {
    const now = new Date();
    let startDate;
    switch (period) {
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'monthly':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'yearly':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }
    const events = await Event.find({
      createdAt: {
        $gte: startDate
      }
    });
    const analysis = {
      totalEvents: events.length,
      totalRevenue: 0,
      totalTickets: 0,
      growthRate: 0,
      popularCategories: {},
      eventStatus: {
        upcoming: 0,
        ongoing: 0,
        completed: 0
      }
    };
    for (const event of events) {
      const analytics = await Analytics.findOne({
        eventId: event._id
      });
      if (analytics) {
        analysis.totalRevenue += analytics.metrics.totalRevenue;
        analysis.totalTickets += analytics.metrics.ticketsSold;
      }
      if (!analysis.popularCategories[event.category]) {
        analysis.popularCategories[event.category] = 0;
      }
      analysis.popularCategories[event.category]++;
      const eventDate = new Date(event.date);
      if (eventDate > now) {
        analysis.eventStatus.upcoming++;
      } else if (eventDate <= now && eventDate >= startDate) {
        analysis.eventStatus.ongoing++;
      } else {
        analysis.eventStatus.completed++;
      }
    }
    const previousPeriod = new Date(startDate);
    previousPeriod.setDate(
      previousPeriod.getDate() - (period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365)
    );
    const previousEvents = await Event.countDocuments({
      createdAt: {
        $gte: previousPeriod,
        $lt: startDate
      }
    });
    analysis.growthRate =
      previousEvents > 0 ? ((events.length - previousEvents) / previousEvents) * 100 : 100;
    return analysis;
  } catch (error) {
    logger.error(`Get platform growth analysis error: ${error.message}`);
    throw error;
  }
};

const exportEventReportToExcel = async (eventId, startDate, endDate) => {
  try {
    const report = await getEventSalesReport(eventId, startDate, endDate);
    const event = await Event.findById(eventId);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Penjualan');
    worksheet.columns = [
      {
        header: 'Tanggal',
        key: 'date',
        width: 15
      },
      {
        header: 'Jumlah Penjualan',
        key: 'sales',
        width: 15
      },
      {
        header: 'Pendapatan',
        key: 'revenue',
        width: 15
      },
      {
        header: 'Metode Pembayaran',
        key: 'paymentMethod',
        width: 20
      }
    ];
    Object.entries(report.dailySales).forEach(([date, data]) => {
      worksheet.addRow({
        date,
        sales: data.sales,
        revenue: data.revenue,
        paymentMethod: Object.entries(report.paymentMethods)
          .map(([method, stats]) => `${method}: ${stats.count}`)
          .join(', ')
      });
    });
    worksheet.addRow([]);
    worksheet.addRow(['Total Penjualan', report.totalSales]);
    worksheet.addRow(['Total Pendapatan', report.totalRevenue]);
    const exportPath = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportPath)) {
      fs.mkdirSync(exportPath, {
        recursive: true
      });
    }
    const fileName = `event-report-${eventId}-${Date.now()}.xlsx`;
    const filePath = path.join(exportPath, fileName);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  } catch (error) {
    logger.error(`Export event report to Excel error: ${error.message}`);
    throw error;
  }
};

const exportEventReportToPDF = async (eventId, startDate, endDate) => {
  try {
    const report = await getEventSalesReport(eventId, startDate, endDate);
    const event = await Event.findById(eventId);
    const doc = new PDFDocument();
    const exportPath = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportPath)) {
      fs.mkdirSync(exportPath, {
        recursive: true
      });
    }
    const fileName = `event-report-${eventId}-${Date.now()}.pdf`;
    const filePath = path.join(exportPath, fileName);
    doc.pipe(fs.createWriteStream(filePath));
    doc.fontSize(20).text('Laporan Penjualan Event', {
      align: 'center'
    });
    doc.moveDown();
    doc.fontSize(12).text(`Event: ${event.title}`);
    doc.text(`Periode: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    doc.moveDown();
    doc.fontSize(14).text('Ringkasan');
    doc.fontSize(12).text(`Total Penjualan: ${report.totalSales}`);
    doc.text(`Total Pendapatan: Rp ${report.totalRevenue.toLocaleString()}`);
    doc.moveDown();
    doc.fontSize(14).text('Penjualan per Tipe Tiket');
    Object.entries(report.ticketTypes).forEach(([type, data]) => {
      doc.fontSize(12).text(`${type}: ${data.sold} tiket (Rp ${data.revenue.toLocaleString()})`);
    });
    doc.moveDown();
    doc.fontSize(14).text('Metode Pembayaran');
    Object.entries(report.paymentMethods).forEach(([method, data]) => {
      doc
        .fontSize(12)
        .text(`${method}: ${data.count} transaksi (Rp ${data.amount.toLocaleString()})`);
    });
    doc.end();
    return filePath;
  } catch (error) {
    logger.error(`Export event report to PDF error: ${error.message}`);
    throw error;
  }
};

const getEventDashboardStats = async eventId => {
  try {
    const analytics = await Analytics.findOne({
      eventId
    });
    if (!analytics) {
      throw new Error('Analytics tidak ditemukan');
    }
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event tidak ditemukan');
    }
    const stats = {
      eventId,
      eventTitle: event.title,
      totalViews: analytics.metrics.totalViews,
      uniqueVisitors: analytics.metrics.uniqueVisitors,
      ticketsSold: analytics.metrics.ticketsSold,
      totalRevenue: analytics.metrics.totalRevenue,
      averageTicketPrice: analytics.metrics.averageTicketPrice,
      conversionRate: analytics.metrics.conversionRate,
      ticketTypes: analytics.ticketTypes,
      dailyStats: analytics.dailyStats,
      remainingTickets: event.availableTickets,
      totalTickets: event.totalTickets,
      soldPercentage: ((event.totalTickets - event.availableTickets) / event.totalTickets) * 100
    };
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const recentSales = analytics.dailyStats
      .filter(stat => new Date(stat.date) >= last7Days)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    stats.salesTrend = recentSales.map(stat => ({
      date: stat.date,
      sales: stat.sales,
      revenue: stat.revenue
    }));
    return stats;
  } catch (error) {
    logger.error(`Get event dashboard stats error: ${error.message}`);
    throw error;
  }
};

const getCreatorDashboardStats = async creatorId => {
  try {
    const events = await Event.find({
      creator: creatorId
    });
    const stats = {
      totalEvents: events.length,
      totalRevenue: 0,
      totalTicketsSold: 0,
      averageTicketPrice: 0,
      eventsByStatus: {
        upcoming: 0,
        ongoing: 0,
        completed: 0
      },
      eventsByCategory: {},
      recentEvents: [],
      topPerformingEvents: []
    };
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    for (const event of events) {
      const analytics = await Analytics.findOne({
        eventId: event._id
      });
      if (analytics) {
        stats.totalRevenue += analytics.metrics.totalRevenue;
        stats.totalTicketsSold += analytics.metrics.ticketsSold;
      }
      const eventDate = new Date(event.date);
      if (eventDate > now) {
        stats.eventsByStatus.upcoming++;
      } else if (eventDate <= now && eventDate >= thirtyDaysAgo) {
        stats.eventsByStatus.ongoing++;
      } else {
        stats.eventsByStatus.completed++;
      }
      if (!stats.eventsByCategory[event.category]) {
        stats.eventsByCategory[event.category] = 0;
      }
      stats.eventsByCategory[event.category]++;
      if (event.createdAt >= thirtyDaysAgo) {
        stats.recentEvents.push({
          id: event._id,
          title: event.title,
          date: event.date,
          category: event.category,
          ticketsSold: analytics ? analytics.metrics.ticketsSold : 0,
          revenue: analytics ? analytics.metrics.totalRevenue : 0
        });
      }
      if (analytics) {
        stats.topPerformingEvents.push({
          id: event._id,
          title: event.title,
          ticketsSold: analytics.metrics.ticketsSold,
          revenue: analytics.metrics.totalRevenue,
          conversionRate: analytics.metrics.conversionRate
        });
      }
    }
    if (stats.totalTicketsSold > 0) {
      stats.averageTicketPrice = stats.totalRevenue / stats.totalTicketsSold;
    }
    stats.topPerformingEvents.sort((a, b) => b.revenue - a.revenue);
    stats.topPerformingEvents = stats.topPerformingEvents.slice(0, 5);
    stats.recentEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    return stats;
  } catch (error) {
    logger.error(`Get creator dashboard stats error: ${error.message}`);
    throw error;
  }
};

const getPlatformDashboardStats = async () => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const stats = {
      totalEvents: 0,
      totalRevenue: 0,
      totalTicketsSold: 0,
      activeCreators: 0,
      eventsByStatus: {
        upcoming: 0,
        ongoing: 0,
        completed: 0
      },
      eventsByCategory: {},
      topCategories: [],
      topCreators: [],
      recentActivity: []
    };
    const events = await Event.find();
    stats.totalEvents = events.length;
    for (const event of events) {
      const analytics = await Analytics.findOne({
        eventId: event._id
      });
      if (analytics) {
        stats.totalRevenue += analytics.metrics.totalRevenue;
        stats.totalTicketsSold += analytics.metrics.ticketsSold;
      }
      const eventDate = new Date(event.date);
      if (eventDate > now) {
        stats.eventsByStatus.upcoming++;
      } else if (eventDate <= now && eventDate >= thirtyDaysAgo) {
        stats.eventsByStatus.ongoing++;
      } else {
        stats.eventsByStatus.completed++;
      }
      if (!stats.eventsByCategory[event.category]) {
        stats.eventsByCategory[event.category] = {
          count: 0,
          revenue: 0,
          ticketsSold: 0
        };
      }
      stats.eventsByCategory[event.category].count++;
      if (analytics) {
        stats.eventsByCategory[event.category].revenue += analytics.metrics.totalRevenue;
        stats.eventsByCategory[event.category].ticketsSold += analytics.metrics.ticketsSold;
      }
    }
    stats.topCategories = Object.entries(stats.eventsByCategory)
      .map(([category, data]) => ({
        category,
        count: data.count,
        revenue: data.revenue,
        ticketsSold: data.ticketsSold
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    const creators = await Event.distinct('creator');
    stats.activeCreators = creators.length;
    const creatorStats = await Promise.all(
      creators.map(async creatorId => {
        const creatorEvents = await Event.find({
          creator: creatorId
        });
        let creatorRevenue = 0;
        let creatorTickets = 0;
        for (const event of creatorEvents) {
          const analytics = await Analytics.findOne({
            eventId: event._id
          });
          if (analytics) {
            creatorRevenue += analytics.metrics.totalRevenue;
            creatorTickets += analytics.metrics.ticketsSold;
          }
        }
        return {
          creatorId,
          eventCount: creatorEvents.length,
          revenue: creatorRevenue,
          ticketsSold: creatorTickets
        };
      })
    );
    stats.topCreators = creatorStats.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    return stats;
  } catch (error) {
    logger.error(`Get platform dashboard stats error: ${error.message}`);
    throw error;
  }
};

// Fungsi getEventAnalytics
const getEventAnalytics = async (eventId) => {
  try {
    const analytics = await Analytics.findOne({ eventId });
    if (!analytics) {
      return {
        eventId,
        metrics: {
          views: 0,
          uniqueVisitors: 0,
          ticketsSold: 0,
          totalRevenue: 0,
          conversionRate: 0
        },
        visitors: [],
        soldTickets: []
      };
    }
    return analytics;
  } catch (error) {
    logger.error(`Get event analytics error: ${error.message}`);
    throw error;
  }
};

// Fungsi getCreatorAnalytics
const getCreatorAnalytics = async (creatorId) => {
  try {
    const events = await Event.find({ creator: creatorId });
    const analyticsData = {
      totalEvents: events.length,
      totalViews: 0,
      totalUniqueVisitors: 0,
      totalTicketsSold: 0,
      totalRevenue: 0,
      averageConversionRate: 0,
      eventPerformance: []
    };

    for (const event of events) {
      const eventAnalytics = await Analytics.findOne({ eventId: event._id });
      if (eventAnalytics) {
        analyticsData.totalViews += eventAnalytics.metrics.views;
        analyticsData.totalUniqueVisitors += eventAnalytics.metrics.uniqueVisitors;
        analyticsData.totalTicketsSold += eventAnalytics.metrics.ticketsSold;
        analyticsData.totalRevenue += eventAnalytics.metrics.totalRevenue;
        
        analyticsData.eventPerformance.push({
          eventId: event._id,
          title: event.title,
          metrics: eventAnalytics.metrics
        });
      }
    }

    if (analyticsData.totalViews > 0) {
      analyticsData.averageConversionRate = 
        (analyticsData.totalTicketsSold / analyticsData.totalViews) * 100;
    }

    return analyticsData;
  } catch (error) {
    logger.error(`Get creator analytics error: ${error.message}`);
    throw error;
  }
};

// Fungsi getPlatformAnalytics
const getPlatformAnalytics = async () => {
  try {
    const events = await Event.find();
    const analyticsData = {
      totalEvents: events.length,
      totalViews: 0,
      totalUniqueVisitors: 0,
      totalTicketsSold: 0,
      totalRevenue: 0,
      averageConversionRate: 0,
      categoriesPerformance: {},
      topEvents: []
    };

    for (const event of events) {
      const eventAnalytics = await Analytics.findOne({ eventId: event._id });
      if (eventAnalytics) {
        analyticsData.totalViews += eventAnalytics.metrics.views;
        analyticsData.totalUniqueVisitors += eventAnalytics.metrics.uniqueVisitors;
        analyticsData.totalTicketsSold += eventAnalytics.metrics.ticketsSold;
        analyticsData.totalRevenue += eventAnalytics.metrics.totalRevenue;
        
        if (!analyticsData.categoriesPerformance[event.category]) {
          analyticsData.categoriesPerformance[event.category] = {
            events: 0,
            views: 0,
            tickets: 0,
            revenue: 0
          };
        }
        
        analyticsData.categoriesPerformance[event.category].events++;
        analyticsData.categoriesPerformance[event.category].views += eventAnalytics.metrics.views;
        analyticsData.categoriesPerformance[event.category].tickets += eventAnalytics.metrics.ticketsSold;
        analyticsData.categoriesPerformance[event.category].revenue += eventAnalytics.metrics.totalRevenue;
        
        analyticsData.topEvents.push({
          eventId: event._id,
          title: event.title,
          category: event.category,
          metrics: eventAnalytics.metrics
        });
      }
    }

    if (analyticsData.totalViews > 0) {
      analyticsData.averageConversionRate = 
        (analyticsData.totalTicketsSold / analyticsData.totalViews) * 100;
    }
    
    // Sort top events by revenue
    analyticsData.topEvents.sort((a, b) => b.metrics.totalRevenue - a.metrics.totalRevenue);
    analyticsData.topEvents = analyticsData.topEvents.slice(0, 10);

    return analyticsData;
  } catch (error) {
    logger.error(`Get platform analytics error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  trackEventView,
  trackTicketSale,
  getEventAnalytics,
  getCreatorAnalytics,
  getPlatformAnalytics,
  getEventSalesReport,
  getPlatformGrowthAnalysis,
  exportEventReportToExcel,
  exportEventReportToPDF,
  getEventDashboardStats,
  getCreatorDashboardStats,
  getPlatformDashboardStats
};
