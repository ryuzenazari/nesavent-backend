const EventRating = require('../models/EventRating');
const Event = require('../models/Event');
const User = require('../models/User');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const createRating = async (userId, eventId, ratingData) => {
  const existingRating = await EventRating.findOne({ user: userId, event: eventId });
  
  if (existingRating) {
    throw new Error('Anda sudah memberikan rating untuk event ini');
  }
  
  const newRating = new EventRating({
    user: userId,
    event: eventId,
    ...ratingData
  });
  
  await newRating.save();
  
  await updateEventAverageRating(eventId);
  
  return newRating;
};

const updateRating = async (ratingId, userId, updatedData) => {
  const rating = await EventRating.findById(ratingId);
  
  if (!rating) {
    throw new Error('Rating tidak ditemukan');
  }
  
  if (rating.user.toString() !== userId) {
    throw new Error('Anda tidak memiliki izin untuk mengubah rating ini');
  }
  
  Object.assign(rating, updatedData, { updatedAt: Date.now() });
  await rating.save();
  
  await updateEventAverageRating(rating.event);
  
  return rating;
};

const deleteRating = async (ratingId, userId, isAdmin = false) => {
  const rating = await EventRating.findById(ratingId);
  
  if (!rating) {
    throw new Error('Rating tidak ditemukan');
  }
  
  if (!isAdmin && rating.user.toString() !== userId) {
    throw new Error('Anda tidak memiliki izin untuk menghapus rating ini');
  }
  
  const eventId = rating.event;
  
  await EventRating.findByIdAndDelete(ratingId);
  
  await updateEventAverageRating(eventId);
  
  return { success: true, message: 'Rating berhasil dihapus' };
};

const getEventRatings = async (eventId, options = {}) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', order = -1, filter } = options;
  
  const query = { event: eventId };
  
  if (filter?.status) {
    query.status = filter.status;
  }
  
  if (filter?.minRating) {
    query.rating = { $gte: parseInt(filter.minRating) };
  }
  
  const sort = {};
  sort[sortBy] = order;
  
  const total = await EventRating.countDocuments(query);
  
  const ratings = await EventRating.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user', 'name profileImage')
    .lean();
  
  return {
    ratings,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRatings: total
    }
  };
};

const getUserRatings = async (userId, options = {}) => {
  const { page = 1, limit = 10 } = options;
  
  const total = await EventRating.countDocuments({ user: userId });
  
  const ratings = await EventRating.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('event', 'title image startDate')
    .lean();
  
  return {
    ratings,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRatings: total
    }
  };
};

const likeRating = async (ratingId, userId) => {
  const rating = await EventRating.findById(ratingId);
  
  if (!rating) {
    throw new Error('Rating tidak ditemukan');
  }
  
  const userIdObj = new ObjectId(userId);
  const hasLiked = rating.likes.users.some(id => id.equals(userIdObj));
  
  if (hasLiked) {
    rating.likes.users = rating.likes.users.filter(id => !id.equals(userIdObj));
    rating.likes.count -= 1;
  } else {
    rating.likes.users.push(userIdObj);
    rating.likes.count += 1;
  }
  
  await rating.save();
  
  return {
    success: true,
    liked: !hasLiked,
    likesCount: rating.likes.count
  };
};

const updateEventAverageRating = async (eventId) => {
  const result = await EventRating.aggregate([
    { $match: { event: new ObjectId(eventId), status: 'active' } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  
  const avgRating = result.length > 0 ? result[0].avgRating : 0;
  const count = result.length > 0 ? result[0].count : 0;
  
  await Event.findByIdAndUpdate(eventId, { 
    'ratings.average': parseFloat(avgRating.toFixed(1)), 
    'ratings.count': count 
  });
  
  return { avgRating, count };
};

const flagRating = async (ratingId, adminId, reason) => {
  const rating = await EventRating.findByIdAndUpdate(
    ratingId,
    { 
      status: 'flagged',
      flaggedBy: adminId,
      flagReason: reason
    },
    { new: true }
  );
  
  if (!rating) {
    throw new Error('Rating tidak ditemukan');
  }
  
  await updateEventAverageRating(rating.event);
  
  return rating;
};

module.exports = {
  createRating,
  updateRating,
  deleteRating,
  getEventRatings,
  getUserRatings,
  likeRating,
  updateEventAverageRating,
  flagRating
}; 