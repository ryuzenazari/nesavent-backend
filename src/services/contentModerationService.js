const ContentModeration = require('../models/ContentModeration');
const AdminNotification = require('../models/AdminNotification');
const ModerationCase = require('../models/ModerationCase');
const Event = require('../models/Event');
const User = require('../models/User');
const logger = require('../utils/logger');

const reportContent = async (contentType, contentId, userId, reason, details) => {
  try {
    const result = await ContentModeration.reportContent(contentType, contentId, userId, reason, details);
    
    // Create admin notification for new high severity reports or multiple reports
    if (result.severity === 'high' || result.reportedBy.length >= 3) {
      await AdminNotification.createNotification({
        type: 'moderation',
        title: 'Content reported multiple times',
        message: `${contentType} content has been reported by multiple users. Needs review.`,
        priority: 'high',
        actionRequired: true,
        relatedTo: {
          model: 'ContentModeration',
          id: result._id
        }
      });
    }
    
    return result;
  } catch (error) {
    throw new Error(`Content moderation service error: ${error.message}`);
  }
};

const getModerationCases = async (filter = {}, options = {}) => {
  try {
    const cases = await ModerationCase.find(filter)
      .populate('reportedBy', 'name email')
      .populate('contentOwnerId', 'name email')
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50);
    
    return cases;
  } catch (error) {
    logger.error('Error getting moderation cases:', error);
    throw error;
  }
};

const getModerationCaseById = async (caseId) => {
  try {
    const moderationCase = await ModerationCase.findById(caseId)
      .populate('reportedBy', 'name email')
      .populate('contentOwnerId', 'name email')
      .populate('reviewedBy', 'name email');
    
    if (!moderationCase) {
      throw new Error('Moderation case not found');
    }
    
    return moderationCase;
  } catch (error) {
    logger.error(`Error getting moderation case by ID ${caseId}:`, error);
    throw error;
  }
};

const createModerationCase = async (caseData) => {
  try {
    const moderationCase = new ModerationCase(caseData);
    await moderationCase.save();
    return moderationCase;
  } catch (error) {
    logger.error('Error creating moderation case:', error);
    throw error;
  }
};

const moderateContent = async (caseId, action, reviewerId, notes = '') => {
  try {
    const moderationCase = await ModerationCase.findById(caseId);
    
    if (!moderationCase) {
      throw new Error('Moderation case not found');
    }
    
    if (moderationCase.status !== 'pending') {
      throw new Error('This case has already been moderated');
    }
    
    moderationCase.status = action;
    moderationCase.reviewedBy = reviewerId;
    moderationCase.reviewedAt = new Date();
    moderationCase.notes = notes;
    
    // Jika konten akan dihapus
    if (action === 'removed') {
      switch (moderationCase.contentType) {
        case 'event':
          await Event.findByIdAndUpdate(moderationCase.contentId, { 
            status: 'removed',
            removedReason: notes,
            removedAt: new Date(),
            removedBy: reviewerId
          });
          break;
          
        case 'user':
          await User.findByIdAndUpdate(moderationCase.contentId, {
            isActive: false,
            deactivationReason: notes,
            deactivatedAt: new Date(),
            deactivatedBy: reviewerId
          });
          break;
          
        // Tambahkan case untuk tipe konten lainnya
        default:
          logger.warn(`No removal handling for content type: ${moderationCase.contentType}`);
      }
    }
    
    await moderationCase.save();
    return moderationCase;
  } catch (error) {
    logger.error(`Error moderating content for case ${caseId}:`, error);
    throw error;
  }
};

const getContentModerationStats = async () => {
  try {
    const stats = await ContentModeration.aggregate([
      {
        $facet: {
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          bySeverity: [
            { $group: { _id: "$severity", count: { $sum: 1 } } }
          ],
          byContentType: [
            { $group: { _id: "$contentType", count: { $sum: 1 } } }
          ],
          byViolationType: [
            { $group: { _id: "$violationType", count: { $sum: 1 } } }
          ],
          totalCases: [
            { $count: "count" }
          ],
          pendingCases: [
            { $match: { status: "pending" } },
            { $count: "count" }
          ],
          resolvedToday: [
            { 
              $match: { 
                status: { $in: ["approved", "rejected", "removed"] },
                "moderatedBy.timestamp": { 
                  $gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
              } 
            },
            { $count: "count" }
          ]
        }
      }
    ]);
    
    // Transform the results to a more friendly format
    const formattedStats = {
      byStatus: {},
      bySeverity: {},
      byContentType: {},
      byViolationType: {},
      totalCases: stats[0].totalCases[0]?.count || 0,
      pendingCases: stats[0].pendingCases[0]?.count || 0,
      resolvedToday: stats[0].resolvedToday[0]?.count || 0
    };
    
    stats[0].byStatus.forEach(item => {
      formattedStats.byStatus[item._id] = item.count;
    });
    
    stats[0].bySeverity.forEach(item => {
      formattedStats.bySeverity[item._id] = item.count;
    });
    
    stats[0].byContentType.forEach(item => {
      formattedStats.byContentType[item._id] = item.count;
    });
    
    stats[0].byViolationType.forEach(item => {
      formattedStats.byViolationType[item._id] = item.count;
    });
    
    return formattedStats;
  } catch (error) {
    throw new Error(`Failed to get content moderation stats: ${error.message}`);
  }
};

module.exports = {
  reportContent,
  getModerationCases,
  getModerationCaseById,
  createModerationCase,
  moderateContent,
  getContentModerationStats
}; 