const express = require('express');
const router = express.Router();
const socialShareController = require('../controllers/socialShareController');
const { authenticate, verifyEventCreator } = require('../middleware/auth');

router.post('/events/:eventId/share', authenticate, socialShareController.createShareWithShortLink);
router.get('/events/:eventId/share-links', authenticate, socialShareController.getSharingLinks);
router.get('/events/:eventId/shares', authenticate, verifyEventCreator, socialShareController.getEventShares);
router.get('/events/:eventId/shares/statistics', authenticate, verifyEventCreator, socialShareController.getShareStatistics);
router.get('/user/shares', authenticate, socialShareController.getUserShares);
router.get('/track-share/:referralCode', socialShareController.trackShareClick);

module.exports = router; 