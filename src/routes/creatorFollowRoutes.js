const express = require('express');
const router = express.Router();
const creatorFollowController = require('../controllers/creatorFollowController');
const { authenticateJWT, authorizeRole } = require('../middleware/authMiddleware');

router.post('/creators/:creatorId/follow', authenticateJWT, creatorFollowController.followCreator);
router.delete('/creators/:creatorId/follow', authenticateJWT, creatorFollowController.unfollowCreator);
router.get('/creators/:creatorId/followers', authenticateJWT, creatorFollowController.getFollowers);
router.get('/creators/:creatorId/follow-status', authenticateJWT, creatorFollowController.getFollowStatus);
router.put('/creators/:creatorId/notifications', authenticateJWT, creatorFollowController.updateNotificationSettings);
router.get('/user/following', authenticateJWT, creatorFollowController.getFollowing);
router.get('/creators/top', creatorFollowController.getTopCreators);
router.get('/creators/suggested', authenticateJWT, creatorFollowController.getSuggestedCreators);

module.exports = router; 