const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
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
    addedAt: {
      type: Date,
      default: Date.now
    },
    notifications: {
      reminders: {
        type: Boolean,
        default: true
      },
      priceDrops: {
        type: Boolean,
        default: true
      },
      limitedTickets: {
        type: Boolean,
        default: true
      }
    },
    notes: String
  }],
  collections: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    isPrivate: {
      type: Boolean,
      default: false
    },
    events: [{
      eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    defaultNotifications: {
      reminders: {
        type: Boolean,
        default: true
      },
      priceDrops: {
        type: Boolean,
        default: true
      },
      limitedTickets: {
        type: Boolean,
        default: true
      }
    },
    autoRemove: {
      afterPurchase: {
        type: Boolean,
        default: false
      },
      afterEvent: {
        type: Boolean,
        default: false
      }
    }
  }
}, {
  timestamps: true
});

wishlistSchema.index({ userId: 1 });
wishlistSchema.index({ 'events.eventId': 1 });
wishlistSchema.index({ 'collections.isPrivate': 1 });

wishlistSchema.statics.addToWishlist = async function(userId, eventId, notificationSettings = {}, notes = '') {
  const wishlist = await this.findOne({ userId });
  
  if (!wishlist) {
    return await this.create({
      userId,
      events: [{
        eventId,
        notifications: {
          ...notificationSettings
        },
        notes
      }]
    });
  }
  
  const existingEventIndex = wishlist.events.findIndex(
    e => e.eventId.toString() === eventId.toString()
  );
  
  if (existingEventIndex >= 0) {
    wishlist.events[existingEventIndex].notifications = {
      ...wishlist.events[existingEventIndex].notifications,
      ...notificationSettings
    };
    
    if (notes) {
      wishlist.events[existingEventIndex].notes = notes;
    }
  } else {
    wishlist.events.push({
      eventId,
      notifications: {
        ...wishlist.settings.defaultNotifications,
        ...notificationSettings
      },
      notes
    });
  }
  
  return await wishlist.save();
};

wishlistSchema.statics.removeFromWishlist = async function(userId, eventId) {
  return await this.updateOne(
    { userId },
    { $pull: { events: { eventId } } }
  );
};

wishlistSchema.statics.createCollection = async function(userId, name, description = '', isPrivate = false) {
  return await this.updateOne(
    { userId },
    { 
      $push: { 
        collections: {
          name,
          description,
          isPrivate,
          events: []
        }
      } 
    },
    { upsert: true }
  );
};

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist; 