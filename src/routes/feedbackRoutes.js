const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticate, authorize, isEventCreator } = require('../middleware/authMiddleware');

router.post('/events/:eventId/feedback', authenticate, feedbackController.createFeedback);
router.get('/events/:eventId/feedback', authenticate, feedbackController.getEventFeedbacks);
router.get('/events/:eventId/feedback/statistics', authenticate, isEventCreator, feedbackController.getFeedbackStatistics);
router.get('/user/feedback', authenticate, feedbackController.getUserFeedbacks);
router.put('/feedback/:feedbackId', authenticate, feedbackController.updateFeedback);
router.delete('/feedback/:feedbackId', authenticate, feedbackController.deleteFeedback);
router.post('/feedback/:feedbackId/respond', authenticate, isEventCreator, feedbackController.respondToFeedback);
router.put('/feedback/:feedbackId/status', authenticate, isEventCreator, feedbackController.changeFeedbackStatus);

module.exports = router; 