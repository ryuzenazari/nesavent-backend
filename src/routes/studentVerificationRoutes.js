const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/studentVerificationController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/request', authenticate, controller.uploadKTM, controller.requestVerification);
router.post('/:id/upload', authenticate, controller.uploadKTM);
router.get('/', authenticate, authorize(['admin']), controller.getAllVerifications);
router.get('/:id', authenticate, controller.getVerificationById);
router.get('/user/:userId', authenticate, controller.getUserVerification);
router.get('/history/:userId', authenticate, authorize(['admin']), controller.getVerificationHistory);
router.post('/:id/approve', authenticate, authorize(['admin']), controller.approveVerification);
router.post('/:id/reject', authenticate, authorize(['admin']), controller.rejectVerification);
router.get('/status', authMiddleware.authenticateJWT, controller.getVerificationStatus);
router.post('/submit', authMiddleware.authenticateJWT, controller.submitVerification);

module.exports = router; 