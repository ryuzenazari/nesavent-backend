const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

const getCreatorEvents = async (creatorId, filters = {}) => {
  try {
    const query = { creatorId };
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.timeframe === 'upcoming') {
      query.eventDate = { $gte: new Date() };
    } else if (filters.timeframe === 'past') {
      query.eventDate = { $lt: new Date() };
    }
    
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    const sortOption = {};
    
    if (filters.sort === 'dateAsc') {
      sortOption.eventDate = 1;
    } else if (filters.sort === 'dateDesc') {
      sortOption.eventDate = -1;
    } else if (filters.sort === 'titleAsc') {
      sortOption.title = 1;
    } else if (filters.sort === 'titleDesc') {
      sortOption.title = -1;
    } else if (filters.sort === 'revenue') {
      sortOption.revenue = -1;
    } else {
      sortOption.createdAt = -1;
    }
    
    const eventsQuery = Event.find(query)
      .sort(sortOption)
      .select('title description bannerImage eventDate location category status viewCount ticketsSold revenue');
      
    if (filters.limit) {
      const page = filters.page || 1;
      const limit = parseInt(filters.limit);
      const skip = (page - 1) * limit;
      
      eventsQuery.skip(skip).limit(limit);
    }
    
    const events = await eventsQuery.exec();
    const total = await Event.countDocuments(query);
    
    return {
      events,
      pagination: {
        total,
        page: filters.page || 1,
        limit: filters.limit || total,
        pages: filters.limit ? Math.ceil(total / filters.limit) : 1
      }
    };
  } catch (error) {
    throw new Error(`Failed to get creator events: ${error.message}`);
  }
};

const bulkUpdateEventStatus = async (creatorId, eventIds, status) => {
  try {
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      throw new Error('Event IDs must be a non-empty array');
    }
    
    const validStatus = ['draft', 'published', 'cancelled', 'postponed', 'completed', 'archived'];
    
    if (!validStatus.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatus.join(', ')}`);
    }
    
    const result = await Event.updateMany(
      { _id: { $in: eventIds }, creatorId },
      { $set: { status, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      throw new Error('No matching events found for this creator');
    }
    
    return {
      success: true,
      message: `Successfully updated ${result.modifiedCount} events to status '${status}'`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    };
  } catch (error) {
    throw new Error(`Failed to update event status: ${error.message}`);
  }
};

const duplicateEvent = async (creatorId, eventId, overrideData = {}) => {
  try {
    const event = await Event.findOne({ _id: eventId, creatorId });
    
    if (!event) {
      throw new Error('Event not found or not owned by this creator');
    }
    
    const newEvent = new Event({
      creatorId,
      title: overrideData.title || `${event.title} (Copy)`,
      description: overrideData.description || event.description,
      category: event.category,
      eventDate: overrideData.eventDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week later
      endDate: overrideData.endDate || (event.endDate ? new Date(new Date(event.endDate).getTime() + 7 * 24 * 60 * 60 * 1000) : null),
      location: event.location,
      bannerImage: event.bannerImage,
      ticketTypes: event.ticketTypes.map(type => ({
        name: type.name,
        description: type.description,
        price: type.price,
        quantity: type.quantity,
        benefits: type.benefits,
        color: type.color,
        isActive: type.isActive
      })),
      schedule: event.schedule,
      settings: event.settings,
      additionalInfo: event.additionalInfo,
      organizers: event.organizers,
      socialLinks: event.socialLinks,
      status: 'draft'
    });
    
    await newEvent.save();
    return newEvent;
  } catch (error) {
    throw new Error(`Failed to duplicate event: ${error.message}`);
  }
};

const bulkExportEventData = async (creatorId, eventIds) => {
  try {
    const events = await Event.find({
      _id: { $in: eventIds },
      creatorId
    }).select('-__v');
    
    if (events.length === 0) {
      throw new Error('No events found for export');
    }
    
    const eventData = await Promise.all(events.map(async (event) => {
      const tickets = await Ticket.countDocuments({ eventId: event._id });
      const ticketsUsed = await Ticket.countDocuments({ eventId: event._id, status: 'used' });
      const revenue = await Transaction.aggregate([
        { $match: { eventId: event._id, status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      return {
        id: event._id,
        title: event.title,
        date: event.eventDate,
        endDate: event.endDate,
        location: event.location,
        category: event.category,
        status: event.status,
        ticketTypes: event.ticketTypes,
        tickets: {
          sold: tickets,
          used: ticketsUsed
        },
        revenue: revenue.length > 0 ? revenue[0].total : 0,
        views: event.viewCount || 0,
        createdAt: event.createdAt
      };
    }));
    
    return {
      creatorId,
      exportDate: new Date(),
      events: eventData
    };
  } catch (error) {
    throw new Error(`Failed to export event data: ${error.message}`);
  }
};

const bulkDeleteEvents = async (creatorId, eventIds) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const events = await Event.find({
      _id: { $in: eventIds },
      creatorId
    }).session(session);
    
    if (events.length === 0) {
      throw new Error('No events found for deletion');
    }
    
    for (const event of events) {
      const hasTickets = await Ticket.exists({ eventId: event._id }).session(session);
      
      if (hasTickets) {
        throw new Error(`Event "${event.title}" has tickets associated with it and cannot be deleted`);
      }
    }
    
    const result = await Event.deleteMany({
      _id: { $in: eventIds },
      creatorId
    }).session(session);
    
    await session.commitTransaction();
    
    return {
      success: true,
      message: `Successfully deleted ${result.deletedCount} events`,
      deletedCount: result.deletedCount
    };
  } catch (error) {
    await session.abortTransaction();
    throw new Error(`Failed to delete events: ${error.message}`);
  } finally {
    session.endSession();
  }
};

const getBulkEventStatistics = async (creatorId, timeframe = '30days') => {
  try {
    let startDate = new Date();
    
    if (timeframe === '7days') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeframe === '30days') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeframe === '90days') {
      startDate.setDate(startDate.getDate() - 90);
    } else if (timeframe === '1year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else {
      startDate = new Date(0); // All time
    }
    
    const events = await Event.find({ 
      creatorId,
      createdAt: { $gte: startDate }  
    });
    
    const eventIds = events.map(event => event._id);
    
    const ticketsData = await Ticket.aggregate([
      { $match: { 
        eventId: { $in: eventIds },
        createdAt: { $gte: startDate }
      }},
      { $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    const viewsData = await Event.aggregate([
      { $match: { _id: { $in: eventIds } } },
      { $project: {
        viewCount: { $ifNull: ['$viewCount', 0] }
      }},
      { $group: {
        _id: null,
        totalViews: { $sum: '$viewCount' }
      }}
    ]);
    
    const categoryCounts = await Event.aggregate([
      { $match: { 
        creatorId: mongoose.Types.ObjectId(creatorId),
        createdAt: { $gte: startDate }
      }},
      { $group: {
        _id: '$category',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);
    
    const totalRevenue = await Transaction.aggregate([
      { $match: { 
        eventId: { $in: eventIds },
        status: 'success',
        createdAt: { $gte: startDate }
      }},
      { $group: {
        _id: null,
        total: { $sum: '$amount' }
      }}
    ]);
    
    return {
      timeframe,
      totalEvents: events.length,
      ticketsSold: ticketsData.reduce((sum, day) => sum + day.count, 0),
      ticketsByDay: ticketsData,
      totalViews: viewsData.length > 0 ? viewsData[0].totalViews : 0,
      categoryCounts,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0
    };
  } catch (error) {
    throw new Error(`Failed to get bulk event statistics: ${error.message}`);
  }
};

module.exports = {
  getCreatorEvents,
  bulkUpdateEventStatus,
  duplicateEvent,
  bulkExportEventData,
  bulkDeleteEvents,
  getBulkEventStatistics
}; 