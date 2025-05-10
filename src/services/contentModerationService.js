const ContentModeration = require('../models/ContentModeration');
const AdminNotification = require('../models/AdminNotification');

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

const getModerationCases = async (filters = {}, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    
    const query = {};
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.contentType) {
      query.contentType = filters.contentType;
    }
    
    if (filters.severity) {
      query.severity = filters.severity;
    }
    
    const totalCount = await ContentModeration.countDocuments(query);
    
    const cases = await ContentModeration.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reportedBy.userId', 'name email')
      .populate('moderatedBy.userId', 'name email');
    
    return {
      cases,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to get moderation cases: ${error.message}`);
  }
};

const getModerationCase = async (caseId) => {
  try {
    const moderationCase = await ContentModeration.findById(caseId)
      .populate('reportedBy.userId', 'name email')
      .populate('moderatedBy.userId', 'name email');
    
    if (!moderationCase) {
      throw new Error('Moderation case not found');
    }
    
    return moderationCase;
  } catch (error) {
    throw new Error(`Failed to get moderation case: ${error.message}`);
  }
};

const moderateContent = async (caseId, moderatorId, action, notes) => {
  try {
    const result = await ContentModeration.moderateContent(caseId, moderatorId, action, notes);
    
    await AdminNotification.markActionTaken(
      { 'relatedTo.model': 'ContentModeration', 'relatedTo.id': caseId },
      moderatorId,
      `Content moderated with action: ${action}`
    );
    
    return result;
  } catch (error) {
    throw new Error(`Failed to moderate content: ${error.message}`);
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
  getModerationCase,
  moderateContent,
  getContentModerationStats
}; 