const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.post('/events/:eventId/ratings', authenticate, ratingController.createRating);
router.get('/events/:eventId/ratings', ratingController.getEventRatings);
router.get('/user/ratings', authenticate, ratingController.getUserRatings);
router.put('/ratings/:ratingId', authenticate, ratingController.updateRating);
router.delete('/ratings/:ratingId', authenticate, ratingController.deleteRating);
router.post('/ratings/:ratingId/like', authenticate, ratingController.likeRating);
router.put('/ratings/:ratingId/flag', authenticate, authorize(['admin']), ratingController.flagRating);

module.exports = router; 