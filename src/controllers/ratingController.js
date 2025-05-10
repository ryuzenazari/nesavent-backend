const ratingService = require('../services/ratingService');
const { checkPermission } = require('../middleware/authMiddleware');

const createRating = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const ratingData = req.body;
    
    const rating = await ratingService.createRating(userId, eventId, ratingData);
    
    res.status(201).json({
      success: true,
      data: rating
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const updateRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user.id;
    const updatedData = req.body;
    
    const rating = await ratingService.updateRating(ratingId, userId, updatedData);
    
    res.status(200).json({
      success: true,
      data: rating
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const deleteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    const result = await ratingService.deleteRating(ratingId, userId, isAdmin);
    
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getEventRatings = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page, limit, sortBy, order, minRating, status } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      sortBy: sortBy || 'createdAt',
      order: order === 'asc' ? 1 : -1,
      filter: {
        minRating,
        status
      }
    };
    
    const ratings = await ratingService.getEventRatings(eventId, options);
    
    res.status(200).json({
      success: true,
      data: ratings
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getUserRatings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    };
    
    const ratings = await ratingService.getUserRatings(userId, options);
    
    res.status(200).json({
      success: true,
      data: ratings
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const likeRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user.id;
    
    const result = await ratingService.likeRating(ratingId, userId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const flagRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const adminId = req.user.id;
    const { reason } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Hanya admin yang dapat melakukan flag pada rating'
      });
    }
    
    const rating = await ratingService.flagRating(ratingId, adminId, reason);
    
    res.status(200).json({
      success: true,
      data: rating
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createRating,
  updateRating,
  deleteRating,
  getEventRatings,
  getUserRatings,
  likeRating,
  flagRating
}; 