const mongoose = require('mongoose');

const userHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  events: [{
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket'
    },
    attendedAt: {
      type: Date
    },
    purchasedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['purchased', 'attended', 'cancelled', 'transferred'],
      default: 'purchased'
    },
    ticketType: String,
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String,
      createdAt: Date
    },
    feedback: {
      content: String,
      createdAt: Date
    },
    tags: [String]
  }],
  categories: {
    type: Map,
    of: Number,
    default: {}
  },
  interests: [String],
  statistics: {
    totalEvents: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    eventAttendance: {
      type: Number,
      default: 0
    },
    lastEventDate: Date,
    favoriteCategory: String
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

userHistorySchema.index({ userId: 1, 'events.eventId': 1 });
userHistorySchema.index({ userId: 1, 'events.attendedAt': -1 });
userHistorySchema.index({ userId: 1, 'events.purchasedAt': -1 });

userHistorySchema.statics.addEventToHistory = async function(userId, eventData) {
  try {
    const { eventId, ticketId, status, ticketType, price } = eventData;
    
    const userHistory = await this.findOne({ userId });
    
    if (!userHistory) {
      const categoryCount = {};
      if (eventData.category) {
        categoryCount[eventData.category] = 1;
      }
      
      const newHistory = await this.create({
        userId,
        events: [{
          eventId,
          ticketId,
          purchasedAt: new Date(),
          status,
          ticketType
        }],
        categories: categoryCount,
        statistics: {
          totalEvents: 1,
          totalSpent: price || 0,
          lastEventDate: new Date()
        }
      });
      
      return newHistory;
    }
    
    const existingEventIndex = userHistory.events.findIndex(
      e => e.eventId.toString() === eventId.toString()
    );
    
    if (existingEventIndex >= 0) {
      userHistory.events[existingEventIndex].status = status;
      
      if (status === 'attended' && !userHistory.events[existingEventIndex].attendedAt) {
        userHistory.events[existingEventIndex].attendedAt = new Date();
        userHistory.statistics.eventAttendance += 1;
      }
    } else {
      userHistory.events.push({
        eventId,
        ticketId,
        purchasedAt: new Date(),
        status,
        ticketType
      });
      
      userHistory.statistics.totalEvents += 1;
      
      if (price) {
        userHistory.statistics.totalSpent += price;
      }
      
      userHistory.statistics.lastEventDate = new Date();
      
      if (eventData.category) {
        const currentCount = userHistory.categories.get(eventData.category) || 0;
        userHistory.categories.set(eventData.category, currentCount + 1);
        
        const entries = Array.from(userHistory.categories.entries());
        if (entries.length > 0) {
          const favoriteCategory = entries.reduce((a, b) => a[1] > b[1] ? a : b);
          userHistory.statistics.favoriteCategory = favoriteCategory[0];
        }
      }
    }
    
    userHistory.lastUpdated = new Date();
    await userHistory.save();
    return userHistory;
  } catch (error) {
    throw new Error(`Error adding event to history: ${error.message}`);
  }
};

userHistorySchema.statics.updateEventStatus = async function(userId, eventId, status) {
  try {
    const userHistory = await this.findOne({ userId });
    
    if (!userHistory) {
      throw new Error('User history not found');
    }
    
    const eventIndex = userHistory.events.findIndex(
      e => e.eventId.toString() === eventId.toString()
    );
    
    if (eventIndex === -1) {
      throw new Error('Event not found in user history');
    }
    
    userHistory.events[eventIndex].status = status;
    
    if (status === 'attended' && !userHistory.events[eventIndex].attendedAt) {
      userHistory.events[eventIndex].attendedAt = new Date();
      userHistory.statistics.eventAttendance += 1;
    }
    
    userHistory.lastUpdated = new Date();
    await userHistory.save();
    return userHistory;
  } catch (error) {
    throw new Error(`Error updating event status: ${error.message}`);
  }
};

userHistorySchema.statics.addRatingToEvent = async function(userId, eventId, rating, review) {
  try {
    const userHistory = await this.findOne({ userId });
    
    if (!userHistory) {
      throw new Error('User history not found');
    }
    
    const eventIndex = userHistory.events.findIndex(
      e => e.eventId.toString() === eventId.toString()
    );
    
    if (eventIndex === -1) {
      throw new Error('Event not found in user history');
    }
    
    userHistory.events[eventIndex].rating = {
      score: rating,
      review,
      createdAt: new Date()
    };
    
    userHistory.lastUpdated = new Date();
    await userHistory.save();
    return userHistory;
  } catch (error) {
    throw new Error(`Error adding rating to event: ${error.message}`);
  }
};

userHistorySchema.statics.updateUserInterests = async function(userId, interests) {
  try {
    const userHistory = await this.findOneAndUpdate(
      { userId },
      { 
        $set: { 
          interests,
          lastUpdated: new Date()
        }
      },
      { 
        new: true,
        upsert: true
      }
    );
    
    return userHistory;
  } catch (error) {
    throw new Error(`Error updating user interests: ${error.message}`);
  }
};

const UserHistory = mongoose.model('UserHistory', userHistorySchema);

module.exports = UserHistory; 