const feedbackService = require('../services/feedbackService');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');
const logger = require('../utils/logger');

const createFeedback = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, subject, message, email } = req.body;
    
    const feedback = new Feedback({
      user: userId,
      type,
      subject,
      message,
      email: email || req.user.email,
      status: 'pending'
    });
    
    await feedback.save();
    
    logger.info(`Feedback baru dibuat oleh user ${userId}`);
    
    res.status(201).json({
      success: true,
      message: 'Feedback berhasil dikirim',
      data: feedback
    });
  } catch (error) {
    logger.error(`Error membuat feedback: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengirim feedback',
      error: error.message
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
    
    const result = await Feedback.findByIdAndDelete(feedbackId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Feedback tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Feedback berhasil dihapus'
    });
  } catch (error) {
    logger.error(`Error menghapus feedback: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus feedback',
      error: error.message
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

const getUserFeedback = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };
    
    const feedbacks = await Feedback.find({ user: userId })
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);
      
    const total = await Feedback.countDocuments({ user: userId });
    
    res.status(200).json({
      success: true,
      data: feedbacks,
      pagination: {
        total,
        page: options.page,
        limit: options.limit,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    logger.error(`Error mendapatkan feedback pengguna: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil feedback',
      error: error.message
    });
  }
};

const getAllFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }
    
    const feedbacks = await Feedback.find(query)
      .populate('user', 'name email')
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);
      
    const total = await Feedback.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: feedbacks,
      pagination: {
        total,
        page: options.page,
        limit: options.limit,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    logger.error(`Error mendapatkan semua feedback: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil feedback',
      error: error.message
    });
  }
};

const updateFeedbackStatus = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'in_progress', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }
    
    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      { 
        status,
        processedBy: req.user._id,
        processedAt: new Date()
      },
      { new: true }
    );
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Status feedback berhasil diperbarui',
      data: feedback
    });
  } catch (error) {
    logger.error(`Error mengubah status feedback: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui status feedback',
      error: error.message
    });
  }
};

const replyToFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { reply } = req.body;
    
    if (!reply) {
      return res.status(400).json({
        success: false,
        message: 'Isi balasan diperlukan'
      });
    }
    
    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      { 
        reply,
        status: 'resolved',
        repliedBy: req.user._id,
        repliedAt: new Date()
      },
      { new: true }
    );
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Balasan feedback berhasil dikirim',
      data: feedback
    });
  } catch (error) {
    logger.error(`Error membalas feedback: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengirim balasan',
      error: error.message
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
  getUserFeedback,
  getAllFeedback,
  updateFeedbackStatus,
  replyToFeedback,
  getFeedbackStatistics
}; 