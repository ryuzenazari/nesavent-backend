const express = require('express');
const router = express.Router();
const socialShareController = require('../controllers/socialShareController');
const { authenticate, isEventCreator } = require('../middleware/authMiddleware');

router.post('/events/:eventId/share', authenticate, socialShareController.createShareWithShortLink);
router.get('/events/:eventId/share-links', authenticate, socialShareController.getSharingLinks);
router.get('/events/:eventId/shares', authenticate, isEventCreator, socialShareController.getEventShares);
router.get('/events/:eventId/shares/statistics', authenticate, isEventCreator, socialShareController.getShareStatistics);
router.get('/user/shares', authenticate, socialShareController.getUserShares);
router.get('/track-share/:referralCode', socialShareController.trackShareClick);

module.exports = router; 