const express = require('express');
const { body } = require('express-validator');
const { authenticate, verifyCreator } = require('../middleware/auth');
const creatorController = require('../controllers/creatorController');
const { documentUpload, handleUploadError } = require('../utils/uploadConfig');
const router = express.Router();
const { authenticateJWT, authorizeRole } = require('../middleware/authMiddleware');

// Public routes that don't require authentication
router.get('/types/:type', creatorController.getCreatorsByType);

router.use(authenticate);
router.use(authenticateJWT);
router.use(authorizeRole(['creator', 'admin']));

router.post(
  '/verification',
  documentUpload.array('documents', 5),
  handleUploadError,
  [
    body('organizationName').notEmpty().withMessage('Nama organisasi wajib diisi'),
    body('organizationType')
      .notEmpty()
      .isIn(['himpunan', 'ukm', 'fakultas', 'departemen', 'komunitas', 'lainnya'])
      .withMessage('Tipe organisasi tidak valid'),
    body('phoneNumber').notEmpty().withMessage('Nomor telepon wajib diisi'),
    body('description').notEmpty().withMessage('Deskripsi wajib diisi')
  ],
  creatorController.submitVerification
);

router.get('/verification/status', creatorController.getVerificationStatus);

router.post(
  '/staff',
  verifyCreator,
  [
    body('email').optional().isEmail().withMessage('Email tidak valid'),
    body('userId').optional().isMongoId().withMessage('User ID tidak valid'),
    body('staffName').optional().isString().withMessage('Nama staff harus berupa string')
  ],
  creatorController.addStaffCreator
);

router.post(
  '/staff/invite',
  verifyCreator,
  [
    body('email').isEmail().withMessage('Email tidak valid'),
    body('staffName').optional().isString().withMessage('Nama staff harus berupa string'),
    body('permissions').optional().isObject().withMessage('Permissions harus berupa objek')
  ],
  creatorController.inviteStaff
);

router.get(
  '/staff',
  verifyCreator,
  creatorController.getMyStaff
);

router.patch(
  '/staff/:staffId',
  verifyCreator,
  [
    body('permissions').optional().isObject().withMessage('Permissions harus berupa objek'),
    body('staffName').optional().isString().withMessage('Nama staff harus berupa string')
  ],
  creatorController.updateStaffPermissions
);

router.delete(
  '/staff/:staffId',
  verifyCreator,
  creatorController.removeStaff
);

router.get('/dashboard', creatorController.getDashboard);
router.get('/event/:eventId/statistics', creatorController.getEventStatistics);

router.post('/templates', [
  body('name').trim().notEmpty().withMessage('Template name is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
], creatorController.createEventTemplate);

router.get('/templates', creatorController.getEventTemplates);
router.get('/templates/public', creatorController.getPublicTemplates);
router.get('/templates/:templateId', creatorController.getEventTemplateById);

router.put('/templates/:templateId', [
  body('name').optional().trim().notEmpty().withMessage('Template name cannot be empty'),
], creatorController.updateEventTemplate);

router.delete('/templates/:templateId', creatorController.deleteEventTemplate);

router.post('/templates/:templateId/create-event', [
  body('title').trim().notEmpty().withMessage('Event title is required'),
  body('eventDate').isISO8601().withMessage('Valid event date is required'),
], creatorController.createEventFromTemplate);

router.get('/payouts/pending', creatorController.getPendingPayout);
router.get('/payouts/summary', creatorController.getPayoutSummary);

router.post('/payouts', [
  body('paymentMethod').isIn(['bank_transfer', 'e-wallet', 'paypal', 'other']).withMessage('Valid payment method is required'),
], creatorController.requestPayout);

router.get('/payouts', creatorController.getPayouts);
router.get('/payouts/:payoutId', creatorController.getPayoutById);
router.post('/payouts/:payoutId/cancel', creatorController.cancelPayout);

router.get('/events', creatorController.getCreatorEvents);
router.get('/events/statistics', creatorController.getBulkEventStatistics);

router.post('/events/status', [
  body('eventIds').isArray().withMessage('Event IDs must be an array'),
  body('status').isIn(['draft', 'published', 'cancelled', 'postponed', 'completed', 'archived']).withMessage('Valid status is required'),
], creatorController.bulkUpdateEventStatus);

router.post('/events/:eventId/duplicate', creatorController.duplicateEvent);
router.post('/events/export', creatorController.bulkExportEventData);
router.post('/events/delete', creatorController.bulkDeleteEvents);

module.exports = router;
