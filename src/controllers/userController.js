const { validationResult } = require('express-validator');
const wishlistService = require('../services/wishlistService');
const userHistoryService = require('../services/userHistoryService');
const recommendationService = require('../services/recommendationService');
const userRewardService = require('../services/userRewardService');

const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId, notificationSettings, notes } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }
    
    const result = await wishlistService.addToWishlist(userId, eventId, notificationSettings, notes);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    
    const result = await wishlistService.removeFromWishlist(userId, eventId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const populate = req.query.populate === 'true';
    
    const wishlist = await wishlistService.getUserWishlist(userId, populate);
    res.status(200).json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCollection = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const { name, description, isPrivate } = req.body;
    
    const result = await wishlistService.createCollection(userId, name, description, isPrivate);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;
    const updateData = req.body;
    
    const result = await wishlistService.updateCollection(userId, collectionId, updateData);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;
    
    const result = await wishlistService.deleteCollection(userId, collectionId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addEventToCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;
    const { eventId } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }
    
    const result = await wishlistService.addEventToCollection(userId, collectionId, eventId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeEventFromCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId, eventId } = req.params;
    
    const result = await wishlistService.removeEventFromCollection(userId, collectionId, eventId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateWishlistSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;
    
    const result = await wishlistService.updateWishlistSettings(userId, settings);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserEventHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const options = {
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : 10,
      skip: req.query.skip ? parseInt(req.query.skip) : 0,
      sort: req.query.sort || 'recent'
    };
    
    const history = await userHistoryService.getUserEventHistory(userId, options);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const statistics = await userHistoryService.getUserStatistics(userId);
    res.status(200).json(statistics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserInterests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { interests } = req.body;
    
    if (!Array.isArray(interests)) {
      return res.status(400).json({ message: 'Interests should be an array' });
    }
    
    const result = await userHistoryService.updateUserInterests(userId, interests);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserInterests = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const interests = await userHistoryService.getUserInterests(userId);
    res.status(200).json(interests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRecommendedEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    const recommendations = await recommendationService.getRecommendedEvents(userId, limit);
    res.status(200).json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPopularEvents = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    const popularEvents = await recommendationService.getPopularEvents(limit);
    res.status(200).json(popularEvents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSimilarEvents = async (req, res) => {
  try {
    const { eventId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    
    const similarEvents = await recommendationService.getSimilarEvents(eventId, limit);
    res.status(200).json(similarEvents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPersonalizedCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    
    const categories = await recommendationService.getPersonalizedCategories(userId, limit);
    res.status(200).json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserPoints = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const points = await userRewardService.getUserPoints(userId);
    res.status(200).json(points);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPointsTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    
    const transactions = await userRewardService.getPointsTransactions(userId, limit, skip);
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserBadges = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const badges = await userRewardService.getUserBadges(userId);
    res.status(200).json(badges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateBadgeVisibility = async (req, res) => {
  try {
    const userId = req.user.id;
    const { badgeId } = req.params;
    const { displayed } = req.body;
    
    if (displayed === undefined) {
      return res.status(400).json({ message: 'Displayed status is required' });
    }
    
    const result = await userRewardService.updateBadgeVisibility(userId, badgeId, displayed);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const redeemReward = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const rewardData = req.body;
    
    const result = await userRewardService.redeemReward(userId, rewardData);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRedemptionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const history = await userRewardService.getRedemptionHistory(userId);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserRewardProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const profile = await userRewardService.getUserRewardProfile(userId);
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateRewardSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;
    
    const result = await userRewardService.updateRewardSettings(userId, settings);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserStreak = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await userRewardService.updateUserStreak(userId);
    res.status(200).json({
      success: true,
      currentStreak: result.streaks.current,
      longestStreak: result.streaks.longest
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  createCollection,
  updateCollection,
  deleteCollection,
  addEventToCollection,
  removeEventFromCollection,
  updateWishlistSettings,
  
  getUserEventHistory,
  getUserStatistics,
  updateUserInterests,
  getUserInterests,
  
  getRecommendedEvents,
  getPopularEvents,
  getSimilarEvents,
  getPersonalizedCategories,
  
  getUserPoints,
  getPointsTransactions,
  getUserBadges,
  updateBadgeVisibility,
  redeemReward,
  getRedemptionHistory,
  getUserRewardProfile,
  updateRewardSettings,
  updateUserStreak
}; 