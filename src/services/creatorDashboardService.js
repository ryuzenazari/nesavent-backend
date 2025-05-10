const CreatorDashboard = require('../models/CreatorDashboard');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

const updateCreatorDashboard = async (creatorId) => {
  try {
    let dashboard = await CreatorDashboard.findOne({ creatorId });
    
    if (!dashboard) {
      dashboard = new CreatorDashboard({ creatorId });
    }
    
    const events = await Event.find({ creatorId });
    const activeEvents = await Event.countDocuments({ 
      creatorId, 
      eventDate: { $gte: new Date() },
      status: 'published'
    });
    
    const pastEvents = await Event.countDocuments({ 
      creatorId, 
      eventDate: { $lt: new Date() }
    });
    
    const eventIds = events.map(event => event._id);
    
    const ticketsData = await Ticket.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: {
        _id: null,
        totalSold: { $sum: 1 },
        totalAttendees: { $sum: { $cond: [{ $eq: ["$status", "used"] }, 1, 0] } }
      }}
    ]);
    
    const revenueData = await Transaction.aggregate([
      { $match: { 
        eventId: { $in: eventIds },
        status: 'success'
      }},
      { $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" }
      }}
    ]);
    
    const topEvent = await Transaction.aggregate([
      { $match: { 
        eventId: { $in: eventIds },
        status: 'success'
      }},
      { $group: {
        _id: "$eventId",
        ticketsSold: { $sum: 1 },
        revenue: { $sum: "$amount" }
      }},
      { $sort: { revenue: -1 } },
      { $limit: 1 },
      { $lookup: {
        from: 'events',
        localField: '_id',
        foreignField: '_id',
        as: 'eventDetails'
      }},
      { $unwind: '$eventDetails' },
      { $project: {
        eventId: '$_id',
        title: '$eventDetails.title',
        ticketsSold: 1,
        revenue: 1
      }}
    ]);
    
    dashboard.stats.totalEvents = events.length;
    dashboard.stats.activeEvents = activeEvents;
    dashboard.stats.pastEvents = pastEvents;
    dashboard.stats.totalTicketsSold = ticketsData.length > 0 ? ticketsData[0].totalSold : 0;
    dashboard.stats.totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
    dashboard.stats.totalAttendees = ticketsData.length > 0 ? ticketsData[0].totalAttendees : 0;
    
    const totalViews = events.reduce((sum, event) => sum + (event.viewCount || 0), 0);
    const conversionRate = totalViews > 0 ? (dashboard.stats.totalTicketsSold / totalViews) * 100 : 0;
    
    dashboard.performance.conversionRate = parseFloat(conversionRate.toFixed(2));
    dashboard.performance.averageTicketsPerEvent = events.length > 0 ? 
      parseFloat((dashboard.stats.totalTicketsSold / events.length).toFixed(2)) : 0;
    
    if (topEvent && topEvent.length > 0) {
      dashboard.performance.topPerformingEvent = {
        eventId: topEvent[0].eventId,
        title: topEvent[0].title,
        ticketsSold: topEvent[0].ticketsSold,
        revenue: topEvent[0].revenue
      };
    }
    
    const currentMonth = new Date().getMonth();
    const lastMonthTickets = await Ticket.countDocuments({
      eventId: { $in: eventIds },
      createdAt: { 
        $gte: new Date(new Date().setMonth(currentMonth - 1)),
        $lt: new Date()
      }
    });
    
    const twoMonthsAgoTickets = await Ticket.countDocuments({
      eventId: { $in: eventIds },
      createdAt: { 
        $gte: new Date(new Date().setMonth(currentMonth - 2)),
        $lt: new Date(new Date().setMonth(currentMonth - 1))
      }
    });
    
    if (lastMonthTickets > twoMonthsAgoTickets * 1.1) {
      dashboard.performance.recentTrend = 'rising';
    } else if (lastMonthTickets < twoMonthsAgoTickets * 0.9) {
      dashboard.performance.recentTrend = 'declining';
    } else {
      dashboard.performance.recentTrend = 'stable';
    }
    
    dashboard.lastUpdated = new Date();
    
    await dashboard.save();
    return dashboard;
  } catch (error) {
    throw new Error(`Failed to update creator dashboard: ${error.message}`);
  }
};

const getCreatorDashboard = async (creatorId) => {
  try {
    let dashboard = await CreatorDashboard.findOne({ creatorId });
    
    if (!dashboard) {
      dashboard = await updateCreatorDashboard(creatorId);
    }
    
    const lastUpdateTime = new Date(dashboard.lastUpdated).getTime();
    const currentTime = new Date().getTime();
    const hoursSinceLastUpdate = (currentTime - lastUpdateTime) / (1000 * 60 * 60);
    
    if (hoursSinceLastUpdate > 1) {
      dashboard = await updateCreatorDashboard(creatorId);
    }
    
    return dashboard;
  } catch (error) {
    throw new Error(`Failed to get creator dashboard: ${error.message}`);
  }
};

const getEventStatistics = async (creatorId, eventId) => {
  try {
    const event = await Event.findOne({ _id: eventId, creatorId });
    
    if (!event) {
      throw new Error('Event not found or not owned by this creator');
    }
    
    const ticketsData = await Ticket.aggregate([
      { $match: { eventId: mongoose.Types.ObjectId(eventId) } },
      { $group: {
        _id: "$type",
        count: { $sum: 1 },
        used: { $sum: { $cond: [{ $eq: ["$status", "used"] }, 1, 0] } }
      }}
    ]);
    
    const salesData = await Transaction.aggregate([
      { $match: { 
        eventId: mongoose.Types.ObjectId(eventId),
        status: 'success'
      }},
      { $group: {
        _id: { 
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        sales: { $sum: "$amount" },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    return {
      event: {
        title: event.title,
        date: event.eventDate,
        location: event.location,
        status: event.status
      },
      tickets: {
        byType: ticketsData,
        total: ticketsData.reduce((sum, type) => sum + type.count, 0),
        used: ticketsData.reduce((sum, type) => sum + type.used, 0)
      },
      sales: {
        daily: salesData,
        total: salesData.reduce((sum, day) => sum + day.sales, 0),
        ticketCount: salesData.reduce((sum, day) => sum + day.count, 0)
      }
    };
  } catch (error) {
    throw new Error(`Failed to get event statistics: ${error.message}`);
  }
};

module.exports = {
  updateCreatorDashboard,
  getCreatorDashboard,
  getEventStatistics
}; 