const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const authMiddleware = require('../middleware/authMiddleware');
const { ratingValidation } = require('../middleware/validationMiddleware');

// Public routes
router.get('/ratings/:eventId', ratingValidation.getEventRatings, ratingController.getEventRatings);

// Protected routes
router.post('/ratings', authMiddleware.authenticateJWT, ratingValidation.createRating, ratingController.createRating);
router.put('/ratings/:ratingId', authMiddleware.authenticateJWT, ratingController.updateRating);
router.delete('/ratings/:ratingId', authMiddleware.authenticateJWT, ratingController.deleteRating);

module.exports = router; 