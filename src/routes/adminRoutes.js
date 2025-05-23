const express = require('express');
const { body } = require('express-validator');
const { authenticate, verifyAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const { rateLimiters } = require('../middleware/rateLimiter');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);
router.use(verifyAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Notifications
router.get('/notifications', adminController.getNotifications);
router.put('/notifications/:notificationId/read', adminController.markNotificationAsRead);
router.put('/notifications/read-all', adminController.markAllNotificationsAsRead);
router.put('/notifications/:notificationId/action', adminController.markNotificationActionTaken);

// Content Moderation
router.get('/moderation/cases', adminController.getModerationCases);
router.get('/moderation/cases/:caseId', adminController.getModerationCase);
router.put('/moderation/cases/:caseId', [
  body('action').isIn(['approved', 'rejected', 'removed']).withMessage('Tindakan tidak valid'),
  body('notes').optional().isString().withMessage('Catatan harus berupa string')
], adminController.moderateContent);

// Promo Codes
router.post('/promo-codes', [
  body('code').isString().withMessage('Kode promo diperlukan'),
  body('type').isIn(['percentage', 'fixed', 'free']).withMessage('Tipe tidak valid'),
  body('value').optional().isNumeric().withMessage('Nilai harus berupa angka'),
  body('description').isString().withMessage('Deskripsi diperlukan'),
  body('startDate').isISO8601().withMessage('Tanggal mulai tidak valid'),
  body('endDate').isISO8601().withMessage('Tanggal akhir tidak valid')
], adminController.createPromoCode);

router.get('/promo-codes', adminController.getPromoCodes);
router.get('/promo-codes/:promoCodeId', adminController.getPromoCodeById);
router.put('/promo-codes/:promoCodeId', [
  body('code').optional().isString().withMessage('Kode harus berupa string'),
  body('type').optional().isIn(['percentage', 'fixed', 'free']).withMessage('Tipe tidak valid'),
  body('value').optional().isNumeric().withMessage('Nilai harus berupa angka'),
  body('description').optional().isString().withMessage('Deskripsi harus berupa string'),
  body('startDate').optional().isISO8601().withMessage('Tanggal mulai tidak valid'),
  body('endDate').optional().isISO8601().withMessage('Tanggal akhir tidak valid')
], adminController.updatePromoCode);
router.delete('/promo-codes/:promoCodeId', adminController.deletePromoCode);
router.put('/promo-codes/:promoCodeId/status', [
  body('isActive').isBoolean().withMessage('isActive harus berupa boolean')
], adminController.togglePromoCodeStatus);

// Platform Reports
router.post('/reports', [
  body('reportType').isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']).withMessage('Tipe laporan tidak valid'),
  body('startDate').isISO8601().withMessage('Tanggal mulai tidak valid'),
  body('endDate').isISO8601().withMessage('Tanggal akhir tidak valid')
], adminController.generateReport);
router.get('/reports', adminController.getReports);
router.get('/reports/:reportId', adminController.getReportById);
router.put('/reports/:reportId/publish', adminController.publishReport);
router.delete('/reports/:reportId', adminController.deleteReport);

// User Management 
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId/status', adminController.toggleUserStatus);
router.delete('/users/:userId', adminController.deleteUser);

// Event Management
router.get('/events', adminController.getAllEvents);
router.get('/events/:eventId', adminController.getEventById);
router.put('/events/:eventId/status', adminController.updateEventStatus);
router.delete('/events/:eventId', adminController.deleteEvent);

// Verification
router.get('/verifications', adminController.getPendingVerifications);
router.put('/verifications/:verificationId/approve', adminController.approveVerification);
router.put('/verifications/:verificationId/reject', [
  body('reason').notEmpty().withMessage('Alasan penolakan diperlukan')
], adminController.rejectVerification);

module.exports = router; 