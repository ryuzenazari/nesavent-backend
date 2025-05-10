const UserHistory = require('../models/UserHistory');
const Event = require('../models/Event');
const mongoose = require('mongoose');

const addEventToHistory = async (userId, eventData) => {
  try {
    const result = await UserHistory.addEventToHistory(userId, eventData);
    return result;
  } catch (error) {
    throw new Error(`Failed to add event to history: ${error.message}`);
  }
};

const updateEventStatus = async (userId, eventId, status) => {
  try {
    const result = await UserHistory.updateEventStatus(userId, eventId, status);
    return result;
  } catch (error) {
    throw new Error(`Failed to update event status: ${error.message}`);
  }
};

const addRatingToEvent = async (userId, eventId, rating, review) => {
  try {
    const result = await UserHistory.addRatingToEvent(userId, eventId, rating, review);
    return result;
  } catch (error) {
    throw new Error(`Failed to add rating to event: ${error.message}`);
  }
};

const updateUserInterests = async (userId, interests) => {
  try {
    const result = await UserHistory.updateUserInterests(userId, interests);
    return result;
  } catch (error) {
    throw new Error(`Failed to update user interests: ${error.message}`);
  }
};

const getUserEventHistory = async (userId, options = {}) => {
  try {
    const { status, limit = 10, skip = 0, sort = 'recent' } = options;
    
    const userHistory = await UserHistory.findOne({ userId });
    
    if (!userHistory) {
      return { events: [], pagination: { total: 0, limit, skip } };
    }
    
    let events = userHistory.events || [];
    
    if (status) {
      events = events.filter(event => event.status === status);
    }
    
    if (sort === 'recent') {
      events.sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt));
    } else if (sort === 'attended') {
      events.sort((a, b) => {
        if (!a.attendedAt) return 1;
        if (!b.attendedAt) return -1;
        return new Date(b.attendedAt) - new Date(a.attendedAt);
      });
    }
    
    const total = events.length;
    const paginatedEvents = events.slice(skip, skip + limit);
    
    const eventIds = paginatedEvents.map(event => event.eventId);
    
    const eventDetails = await Event.find(
      { _id: { $in: eventIds } },
      { title: 1, description: 1, bannerImage: 1, eventDate: 1, location: 1, category: 1 }
    );
    
    const eventMap = {};
    eventDetails.forEach(event => {
      eventMap[event._id] = event;
    });
    
    const eventHistoryWithDetails = paginatedEvents.map(event => {
      const details = eventMap[event.eventId] || {};
      return {
        ...event.toObject(),
        eventDetails: details
      };
    });
    
    return {
      events: eventHistoryWithDetails,
      statistics: userHistory.statistics,
      pagination: {
        total,
        limit,
        skip,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to get user event history: ${error.message}`);
  }
};

const getUserStatistics = async (userId) => {
  try {
    const userHistory = await UserHistory.findOne({ userId });
    
    if (!userHistory) {
      return {
        totalEvents: 0,
        totalSpent: 0,
        eventAttendance: 0,
        lastEventDate: null,
        favoriteCategory: null,
        categoryCounts: {}
      };
    }
    
    const categoryCounts = {};
    userHistory.categories.forEach((count, category) => {
      categoryCounts[category] = count;
    });
    
    return {
      ...userHistory.statistics.toObject(),
      categoryCounts
    };
  } catch (error) {
    throw new Error(`Failed to get user statistics: ${error.message}`);
  }
};

const getUserInterests = async (userId) => {
  try {
    const userHistory = await UserHistory.findOne({ userId }, { interests: 1 });
    
    if (!userHistory || !userHistory.interests) {
      return { interests: [] };
    }
    
    return { interests: userHistory.interests };
  } catch (error) {
    throw new Error(`Failed to get user interests: ${error.message}`);
  }
};

module.exports = {
  addEventToHistory,
  updateEventStatus,
  addRatingToEvent,
  updateUserInterests,
  getUserEventHistory,
  getUserStatistics,
  getUserInterests
}; 