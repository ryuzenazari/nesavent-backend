const mongoose = require('mongoose');

const contentModerationSchema = new mongoose.Schema({
  contentType: {
    type: String,
    enum: ['event', 'comment', 'profile', 'creator', 'other'],
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'contentType'
  },
  reportedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    details: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'approved', 'rejected', 'removed'],
    default: 'pending'
  },
  moderatedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date,
    action: String,
    notes: String
  },
  violationType: {
    type: String,
    enum: ['inappropriate', 'spam', 'scam', 'copyright', 'violence', 'harassment', 'hate_speech', 'other'],
    default: 'other'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  autoModeration: {
    flagged: {
      type: Boolean,
      default: false
    },
    reason: String,
    confidence: Number
  }
}, {
  timestamps: true
});

contentModerationSchema.index({ contentType: 1, contentId: 1 });
contentModerationSchema.index({ status: 1 });
contentModerationSchema.index({ 'reportedBy.userId': 1 });
contentModerationSchema.index({ severity: 1 });
contentModerationSchema.index({ createdAt: -1 });

contentModerationSchema.statics.reportContent = async function(contentType, contentId, userId, reason, details) {
  try {
    const moderationCase = await this.findOne({ contentType, contentId });
    
    if (moderationCase) {
      const alreadyReported = moderationCase.reportedBy.some(
        report => report.userId.toString() === userId.toString()
      );
      
      if (alreadyReported) {
        return { message: 'Content already reported by this user' };
      }
      
      moderationCase.reportedBy.push({
        userId,
        reason,
        details,
        timestamp: new Date()
      });
      
      if (moderationCase.reportedBy.length >= 3 && moderationCase.status === 'pending') {
        moderationCase.status = 'reviewed';
        moderationCase.severity = 'high';
      }
      
      await moderationCase.save();
      return moderationCase;
    } else {
      const newCase = await this.create({
        contentType,
        contentId,
        reportedBy: [{
          userId,
          reason,
          details,
          timestamp: new Date()
        }],
        status: 'pending',
        severity: 'medium'
      });
      
      return newCase;
    }
  } catch (error) {
    throw new Error(`Failed to report content: ${error.message}`);
  }
};

contentModerationSchema.statics.moderateContent = async function(caseId, moderatorId, action, notes) {
  try {
    const moderationCase = await this.findById(caseId);
    
    if (!moderationCase) {
      throw new Error('Moderation case not found');
    }
    
    moderationCase.status = action;
    moderationCase.moderatedBy = {
      userId: moderatorId,
      timestamp: new Date(),
      action,
      notes
    };
    
    await moderationCase.save();
    return moderationCase;
  } catch (error) {
    throw new Error(`Failed to moderate content: ${error.message}`);
  }
};

const ContentModeration = mongoose.model('ContentModeration', contentModerationSchema);

module.exports = ContentModeration; 