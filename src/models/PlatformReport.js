const mongoose = require('mongoose');

const platformReportSchema = new mongoose.Schema({
  reportType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  dateRange: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  metrics: {
    users: {
      total: Number,
      active: Number,
      new: Number,
      verified: Number,
      creators: Number
    },
    events: {
      total: Number,
      active: Number,
      completed: Number,
      cancelled: Number,
      byCategory: {
        type: Map,
        of: Number
      }
    },
    tickets: {
      sold: Number,
      revenue: Number,
      average: Number,
      free: Number,
      paid: Number
    },
    transactions: {
      total: Number,
      volume: Number,
      successful: Number,
      failed: Number,
      refunded: Number
    },
    revenue: {
      gross: Number,
      net: Number,
      platformFees: Number,
      paymentFees: Number,
      byCategory: {
        type: Map,
        of: Number
      }
    },
    engagement: {
      wishlist: Number,
      views: Number,
      shares: Number,
      ratings: Number,
      averageRating: Number
    },
    promoCodes: {
      active: Number,
      used: Number,
      discount: Number
    },
    contentModeration: {
      cases: Number,
      resolved: Number,
      flagged: Number,
      removed: Number
    }
  },
  insights: [{
    category: String,
    title: String,
    description: String,
    trend: String,
    changePercent: Number,
    recommendation: String
  }],
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: Date,
  viewedBy: [{
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: Date
  }],
  charts: [{
    title: String,
    type: String,
    data: mongoose.Schema.Types.Mixed,
    config: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

platformReportSchema.index({ reportType: 1 });
platformReportSchema.index({ status: 1 });
platformReportSchema.index({ 'dateRange.startDate': 1, 'dateRange.endDate': 1 });
platformReportSchema.index({ createdAt: -1 });
platformReportSchema.index({ generatedBy: 1 });

platformReportSchema.statics.generateReport = async function(reportType, startDate, endDate, adminId) {
  try {
    // This would be implemented with aggregation pipelines from various collections
    // For demonstration, we'll create a sample report structure
    const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Platform Report`;
    
    const newReport = new this({
      reportType,
      title,
      dateRange: {
        startDate,
        endDate
      },
      metrics: {
        // Sample data - in a real implementation, these would be calculated from database
        users: {
          total: 0,
          active: 0,
          new: 0,
          verified: 0,
          creators: 0
        },
        events: {
          total: 0,
          active: 0,
          completed: 0,
          cancelled: 0,
          byCategory: new Map()
        },
        tickets: {
          sold: 0,
          revenue: 0,
          average: 0,
          free: 0,
          paid: 0
        },
        transactions: {
          total: 0,
          volume: 0,
          successful: 0,
          failed: 0,
          refunded: 0
        },
        revenue: {
          gross: 0,
          net: 0,
          platformFees: 0,
          paymentFees: 0,
          byCategory: new Map()
        },
        engagement: {
          wishlist: 0,
          views: 0,
          shares: 0,
          ratings: 0,
          averageRating: 0
        },
        promoCodes: {
          active: 0,
          used: 0,
          discount: 0
        },
        contentModeration: {
          cases: 0,
          resolved: 0,
          flagged: 0,
          removed: 0
        }
      },
      insights: [],
      generatedBy: adminId,
      status: 'draft'
    });
    
    await newReport.save();
    return newReport;
  } catch (error) {
    throw new Error(`Failed to generate platform report: ${error.message}`);
  }
};

platformReportSchema.statics.publishReport = async function(reportId, adminId) {
  try {
    const report = await this.findById(reportId);
    
    if (!report) {
      throw new Error('Report not found');
    }
    
    report.status = 'published';
    report.publishedAt = new Date();
    
    await report.save();
    return report;
  } catch (error) {
    throw new Error(`Failed to publish report: ${error.message}`);
  }
};

platformReportSchema.statics.markAsViewed = async function(reportId, adminId) {
  try {
    const report = await this.findById(reportId);
    
    if (!report) {
      throw new Error('Report not found');
    }
    
    const alreadyViewed = report.viewedBy.some(
      view => view.adminId.toString() === adminId.toString()
    );
    
    if (!alreadyViewed) {
      report.viewedBy.push({
        adminId,
        viewedAt: new Date()
      });
      
      await report.save();
    }
    
    return report;
  } catch (error) {
    throw new Error(`Failed to mark report as viewed: ${error.message}`);
  }
};

const PlatformReport = mongoose.model('PlatformReport', platformReportSchema);

module.exports = PlatformReport; 