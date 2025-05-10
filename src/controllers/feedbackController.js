const feedbackService = require('../services/feedbackService');
const Event = require('../models/Event');

const createFeedback = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const feedbackData = req.body;
    
    const feedback = await feedbackService.createFeedback(userId, eventId, feedbackData);
    
    res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const updateFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const userId = req.user.id;
    const updatedData = req.body;
    
    const feedback = await feedbackService.updateFeedback(feedbackId, userId, updatedData);
    
    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const deleteFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    const result = await feedbackService.deleteFeedback(feedbackId, userId, isAdmin);
    
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getEventFeedbacks = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page, limit, status, feedbackType } = req.query;
    
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan'
      });
    }
    
    const isCreator = (
      req.user.role === 'admin' ||
      event.creator.toString() === req.user.id ||
      (req.user.role === 'staff_creator' && req.user.staffDetails?.creatorId?.toString() === event.creator.toString())
    );
    
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      status,
      feedbackType,
      isCreator
    };
    
    const feedbacks = await feedbackService.getEventFeedbacks(eventId, options);
    
    res.status(200).json({
      success: true,
      data: feedbacks
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getUserFeedbacks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, status } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      status
    };
    
    const feedbacks = await feedbackService.getUserFeedbacks(userId, options);
    
    res.status(200).json({
      success: true,
      data: feedbacks
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const respondToFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const responderId = req.user.id;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Konten respons diperlukan'
      });
    }
    
    const feedback = await feedbackService.respondToFeedback(feedbackId, responderId, content);
    
    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const changeFeedbackStatus = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status diperlukan'
      });
    }
    
    const feedback = await feedbackService.changeFeedbackStatus(feedbackId, status);
    
    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getFeedbackStatistics = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const stats = await feedbackService.getFeedbackStatistics(eventId);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
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