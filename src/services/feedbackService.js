const EventFeedback = require('../models/EventFeedback');
const Event = require('../models/Event');
const User = require('../models/User');
const mongoose = require('mongoose');

const createFeedback = async (userId, eventId, feedbackData) => {
  const event = await Event.findById(eventId);
  
  if (!event) {
    throw new Error('Event tidak ditemukan');
  }
  
  const feedback = new EventFeedback({
    user: userId,
    event: eventId,
    ...feedbackData
  });
  
  await feedback.save();
  
  return feedback;
};

const updateFeedback = async (feedbackId, userId, updatedData) => {
  const feedback = await EventFeedback.findById(feedbackId);
  
  if (!feedback) {
    throw new Error('Feedback tidak ditemukan');
  }
  
  if (feedback.user.toString() !== userId) {
    throw new Error('Anda tidak memiliki izin untuk mengubah feedback ini');
  }
  
  if (feedback.status !== 'pending') {
    throw new Error('Feedback ini sudah diproses dan tidak dapat diubah');
  }
  
  Object.assign(feedback, updatedData);
  await feedback.save();
  
  return feedback;
};

const deleteFeedback = async (feedbackId, userId, isAdmin = false) => {
  const feedback = await EventFeedback.findById(feedbackId);
  
  if (!feedback) {
    throw new Error('Feedback tidak ditemukan');
  }
  
  if (!isAdmin && feedback.user.toString() !== userId) {
    throw new Error('Anda tidak memiliki izin untuk menghapus feedback ini');
  }
  
  if (!isAdmin && feedback.status !== 'pending') {
    throw new Error('Feedback ini sudah diproses dan tidak dapat dihapus');
  }
  
  await EventFeedback.findByIdAndDelete(feedbackId);
  
  return { success: true, message: 'Feedback berhasil dihapus' };
};

const getEventFeedbacks = async (eventId, options = {}) => {
  const { page = 1, limit = 10, status, feedbackType, isPublic, isCreator = false } = options;
  
  const query = { event: eventId };
  
  if (status) {
    query.status = status;
  }
  
  if (feedbackType) {
    query.feedbackType = feedbackType;
  }
  
  if (!isCreator) {
    query.isPublic = true;
  }
  
  const total = await EventFeedback.countDocuments(query);
  
  const feedbacks = await EventFeedback.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user', 'name profileImage')
    .populate('response.respondedBy', 'name role')
    .lean();
  
  const result = feedbacks.map(feedback => {
    if (feedback.isAnonymous && !isCreator) {
      feedback.user = {
        name: 'Anonim',
        profileImage: null
      };
    }
    return feedback;
  });
  
  return {
    feedbacks: result,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalFeedbacks: total
    }
  };
};

const getUserFeedbacks = async (userId, options = {}) => {
  const { page = 1, limit = 10, status } = options;
  
  const query = { user: userId };
  
  if (status) {
    query.status = status;
  }
  
  const total = await EventFeedback.countDocuments(query);
  
  const feedbacks = await EventFeedback.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('event', 'title image startDate')
    .populate('response.respondedBy', 'name role')
    .lean();
  
  return {
    feedbacks,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalFeedbacks: total
    }
  };
};

const respondToFeedback = async (feedbackId, responderId, responseContent) => {
  const feedback = await EventFeedback.findById(feedbackId);
  
  if (!feedback) {
    throw new Error('Feedback tidak ditemukan');
  }
  
  feedback.response = {
    content: responseContent,
    respondedBy: responderId,
    respondedAt: new Date()
  };
  
  feedback.status = 'responded';
  
  await feedback.save();
  
  return feedback;
};

const changeFeedbackStatus = async (feedbackId, status) => {
  const validStatuses = ['pending', 'read', 'responded', 'closed'];
  
  if (!validStatuses.includes(status)) {
    throw new Error('Status tidak valid');
  }
  
  const feedback = await EventFeedback.findByIdAndUpdate(
    feedbackId,
    { status },
    { new: true }
  );
  
  if (!feedback) {
    throw new Error('Feedback tidak ditemukan');
  }
  
  return feedback;
};

const getFeedbackStatistics = async (eventId) => {
  const stats = await EventFeedback.aggregate([
    { $match: { event: mongoose.Types.ObjectId(eventId) } },
    { $group: {
        _id: null,
        total: { $sum: 1 },
        suggestions: { $sum: { $cond: [{ $eq: ['$feedbackType', 'suggestion'] }, 1, 0] } },
        complaints: { $sum: { $cond: [{ $eq: ['$feedbackType', 'complaint'] }, 1, 0] } },
        appreciation: { $sum: { $cond: [{ $eq: ['$feedbackType', 'appreciation'] }, 1, 0] } },
        questions: { $sum: { $cond: [{ $eq: ['$feedbackType', 'question'] }, 1, 0] } },
        other: { $sum: { $cond: [{ $eq: ['$feedbackType', 'other'] }, 1, 0] } },
        responded: { $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
      }
    }
  ]);
  
  return stats.length > 0 ? stats[0] : {
    total: 0,
    suggestions: 0,
    complaints: 0,
    appreciation: 0,
    questions: 0,
    other: 0,
    responded: 0,
    pending: 0
  };
};

module.exports = {
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getEventFeedbacks,
  getUserFeedbacks,
  respondToFeedback,
  changeFeedbackStatus,
  getFeedbackStatistics
}; 