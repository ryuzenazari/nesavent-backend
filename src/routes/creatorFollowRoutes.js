const express = require('express');
const router = express.Router();
const creatorFollowController = require('../controllers/creatorFollowController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.post('/creators/:creatorId/follow', authenticate, creatorFollowController.followCreator);
router.delete('/creators/:creatorId/follow', authenticate, creatorFollowController.unfollowCreator);
router.get('/creators/:creatorId/followers', authenticate, creatorFollowController.getFollowers);
router.get('/creators/:creatorId/follow-status', authenticate, creatorFollowController.getFollowStatus);
router.put('/creators/:creatorId/notifications', authenticate, creatorFollowController.updateNotificationSettings);
router.get('/user/following', authenticate, creatorFollowController.getFollowing);
router.get('/creators/top', creatorFollowController.getTopCreators);
router.get('/creators/suggested', authenticate, creatorFollowController.getSuggestedCreators);

module.exports = router; 