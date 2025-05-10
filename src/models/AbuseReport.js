const mongoose = require('mongoose');

const abuseReportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    resourceType: {
      type: String,
      required: true,
      enum: ['event', 'user', 'comment', 'review', 'feedback', 'other']
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        'spam', 
        'inappropriate_content', 
        'offensive_language', 
        'harmful_content',
        'misleading_information',
        'intellectual_property',
        'impersonation',
        'harassment',
        'fraud',
        'other'
      ]
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000
    },
    evidenceUrls: [{
      type: String,
      validate: {
        validator: function(v) {
          return /^(http|https):\/\/[^ "]+$/.test(v);
        },
        message: props => `${props.value} bukan URL yang valid!`
      }
    }],
    status: {
      type: String,
      enum: ['pending', 'under_review', 'resolved', 'rejected', 'escalated'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewNotes: {
      type: String
    },
    resolution: {
      action: {
        type: String,
        enum: ['none', 'warning', 'content_removed', 'user_suspended', 'user_banned']
      },
      actionDate: Date,
      remarks: String
    },
    escalationLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 3
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    ipAddress: {
      type: String
    },
    relatedReports: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AbuseReport'
    }]
  },
  {
    timestamps: true
  }
);

// Indeks untuk meningkatkan performa query
abuseReportSchema.index({ status: 1 });
abuseReportSchema.index({ reporterId: 1 });
abuseReportSchema.index({ reportedUserId: 1 });
abuseReportSchema.index({ resourceType: 1, resourceId: 1 });
abuseReportSchema.index({ category: 1 });
abuseReportSchema.index({ priority: 1 });
abuseReportSchema.index({ createdAt: 1 });
abuseReportSchema.index({ 'resolution.actionDate': 1 });

const AbuseReport = mongoose.model('AbuseReport', abuseReportSchema);

module.exports = AbuseReport; 