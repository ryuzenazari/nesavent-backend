const creatorFollowService = require('../services/creatorFollowService');

const followCreator = async (req, res) => {
  try {
    const userId = req.user.id;
    const { creatorId } = req.params;
    
    const follow = await creatorFollowService.followCreator(userId, creatorId);
    
    res.status(201).json({
      success: true,
      data: follow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const unfollowCreator = async (req, res) => {
  try {
    const userId = req.user.id;
    const { creatorId } = req.params;
    
    const result = await creatorFollowService.unfollowCreator(userId, creatorId);
    
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getFollowers = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { page, limit } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    };
    
    const followers = await creatorFollowService.getFollowers(creatorId, options);
    
    res.status(200).json({
      success: true,
      data: followers
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getFollowing = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    };
    
    const following = await creatorFollowService.getFollowing(userId, options);
    
    res.status(200).json({
      success: true,
      data: following
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { creatorId } = req.params;
    const settings = req.body;
    
    const follow = await creatorFollowService.updateNotificationSettings(userId, creatorId, settings);
    
    res.status(200).json({
      success: true,
      data: follow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getFollowStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { creatorId } = req.params;
    
    const status = await creatorFollowService.getFollowStatus(userId, creatorId);
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getTopCreators = async (req, res) => {
  try {
    const { limit } = req.query;
    
    const creators = await creatorFollowService.getTopCreators(parseInt(limit) || 10);
    
    res.status(200).json({
      success: true,
      data: creators
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getSuggestedCreators = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit } = req.query;
    
    const creators = await creatorFollowService.getSuggestedCreators(userId, parseInt(limit) || 5);
    
    res.status(200).json({
      success: true,
      data: creators
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  followCreator,
  unfollowCreator,
  getFollowers,
  getFollowing,
  updateNotificationSettings,
  getFollowStatus,
  getTopCreators,
  getSuggestedCreators
};