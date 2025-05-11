const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { body } = require('express-validator');

// Authentication middleware
router.use(authenticateJWT);

// Wishlist routes
router.post('/wishlist', [
  body('eventId').notEmpty().withMessage('Event ID is required')
], userController.addToWishlist);

router.get('/wishlist', userController.getUserWishlist);
router.delete('/wishlist/:eventId', userController.removeFromWishlist);

router.post('/wishlist/collections', [
  body('name').trim().notEmpty().withMessage('Collection name is required')
], userController.createCollection);

router.get('/wishlist/settings', userController.getWishlistSettings);
router.put('/wishlist/settings', userController.updateWishlistSettings);

router.put('/wishlist/collections/:collectionId', userController.updateCollection);
router.delete('/wishlist/collections/:collectionId', userController.deleteCollection);

router.post('/wishlist/collections/:collectionId/events', [
  body('eventId').notEmpty().withMessage('Event ID is required')
], userController.addEventToCollection);

router.delete('/wishlist/collections/:collectionId/events/:eventId', userController.removeEventFromCollection);

// User history routes
router.get('/history', userController.getUserEventHistory);
router.get('/statistics', userController.getUserStatistics);

router.post('/interests', [
  body('interests').isArray().withMessage('Interests should be an array')
], userController.updateUserInterests);

router.get('/interests', userController.getUserInterests);

// Recommendation routes
router.get('/recommendations', userController.getRecommendedEvents);
router.get('/recommendations/popular', userController.getPopularEvents);
router.get('/recommendations/event/:eventId/similar', userController.getSimilarEvents);
router.get('/recommendations/categories', userController.getPersonalizedCategories);

// User reward routes
router.get('/rewards/points', userController.getUserPoints);
router.get('/rewards/points/transactions', userController.getPointsTransactions);

router.get('/rewards/badges', userController.getUserBadges);
router.put('/rewards/badges/:badgeId', [
  body('displayed').isBoolean().withMessage('Displayed status must be boolean')
], userController.updateBadgeVisibility);

router.post('/rewards/redeem', [
  body('rewardId').notEmpty().withMessage('Reward ID is required'),
  body('rewardName').notEmpty().withMessage('Reward name is required'),
  body('pointsCost').isInt({ min: 1 }).withMessage('Points cost must be a positive integer')
], userController.redeemReward);

router.get('/rewards/redemptions', userController.getRedemptionHistory);
router.get('/rewards/profile', userController.getUserRewardProfile);

router.put('/rewards/settings', userController.updateRewardSettings);
router.post('/rewards/streak/update', userController.updateUserStreak);

module.exports = router; 