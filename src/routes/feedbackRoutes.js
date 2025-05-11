const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticate, authorize } = require('../middleware/auth');

// Feedback dari user
router.post('/', authenticate, feedbackController.createFeedback);
router.get('/user', authenticate, feedbackController.getUserFeedback);

// Untuk admin
router.get('/', authenticate, authorize(['admin']), feedbackController.getAllFeedback);
router.put('/:feedbackId/status', authenticate, authorize(['admin']), feedbackController.updateFeedbackStatus);
router.post('/:feedbackId/reply', authenticate, authorize(['admin']), feedbackController.replyToFeedback);
router.delete('/:feedbackId', authenticate, authorize(['admin']), feedbackController.deleteFeedback);

module.exports = router; 