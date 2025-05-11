const mongoose = require('mongoose');

const platformReportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    title: {
      type: String
    },
    description: {
      type: String
    },
    content: {
      userStats: {
        newUsers: Number,
        usersByRole: mongoose.Schema.Types.Mixed
      },
      eventStats: {
        newEvents: Number,
        eventsByStatus: mongoose.Schema.Types.Mixed,
        eventsByCategory: mongoose.Schema.Types.Mixed
      },
      ticketStats: {
        ticketsSold: Number,
        ticketsByType: mongoose.Schema.Types.Mixed
      },
      revenueStats: {
        totalRevenue: Number,
        revenueByDay: [
          {
            date: String,
            amount: Number
          }
        ]
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    publishedAt: {
      type: Date
    },
    viewedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        viewedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Index untuk mencari laporan berdasarkan tipe
platformReportSchema.index({ reportType: 1 });

// Index untuk mencari laporan berdasarkan pembuat
platformReportSchema.index({ createdBy: 1 });

// Index untuk mencari laporan berdasarkan rentang tanggal
platformReportSchema.index({ startDate: 1, endDate: 1 });

// Index untuk mencari laporan berdasarkan status publikasi
platformReportSchema.index({ isPublished: 1 });

const PlatformReport = mongoose.model('PlatformReport', platformReportSchema);

module.exports = PlatformReport; 