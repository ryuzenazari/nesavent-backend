const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/studentVerificationController');

router.post('/request', authenticate, controller.uploadKTM, controller.requestVerification);
router.get('/me', authenticate, controller.getUserVerification);
router.get('/me/history', authenticate, controller.getVerificationHistory);
router.get('/pending', authenticate, authorize(['admin']), controller.getPendingVerifications);
router.post('/:id/approve', authenticate, authorize(['admin']), controller.approveVerification);
router.post('/:id/reject', authenticate, authorize(['admin']), controller.rejectVerification);

module.exports = router; 