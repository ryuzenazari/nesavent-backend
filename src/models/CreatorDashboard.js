const mongoose = require('mongoose');

const creatorDashboardSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  stats: {
    totalEvents: {
      type: Number,
      default: 0
    },
    activeEvents: {
      type: Number,
      default: 0
    },
    pastEvents: {
      type: Number,
      default: 0
    },
    totalTicketsSold: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalAttendees: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    totalFollowers: {
      type: Number,
      default: 0
    }
  },
  performance: {
    conversionRate: {
      type: Number,
      default: 0
    },
    averageTicketsPerEvent: {
      type: Number,
      default: 0
    },
    topPerformingEvent: {
      eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
      },
      title: String,
      ticketsSold: Number,
      revenue: Number
    },
    recentTrend: {
      type: String,
      enum: ['rising', 'stable', 'declining'],
      default: 'stable'
    }
  },
  payout: {
    pendingAmount: {
      type: Number,
      default: 0
    },
    totalPaidOut: {
      type: Number,
      default: 0
    },
    nextPayoutDate: Date,
    payoutHistory: [{
      amount: Number,
      date: Date,
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      },
      reference: String
    }]
  },
  insights: {
    popularTicketTypes: [{
      name: String,
      percentage: Number
    }],
    audienceDemographics: {
      ageGroups: {
        under18: { type: Number, default: 0 },
        age18to24: { type: Number, default: 0 },
        age25to34: { type: Number, default: 0 },
        age35to44: { type: Number, default: 0 },
        age45plus: { type: Number, default: 0 }
      },
      gender: {
        male: { type: Number, default: 0 },
        female: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
      },
      location: [{
        city: String,
        count: Number
      }]
    },
    peakBookingTimes: [{
      timeSlot: String,
      percentage: Number
    }]
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

creatorDashboardSchema.index({ creatorId: 1, 'lastUpdated': -1 });

const CreatorDashboard = mongoose.model('CreatorDashboard', creatorDashboardSchema);

module.exports = CreatorDashboard; 