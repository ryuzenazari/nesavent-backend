const express = require('express');
const { body } = require('express-validator');
const eventController = require('../controllers/eventController');
const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getMyEvents,
  manageTicketTypes,
  generateEventShortLink,
  getEvents,
  getEventByShortLink,
  approveEvent,
  rejectEvent,
  enableEarlyBird,
  addPromoCode,
  enableWaitingList,
  addToWaitingList,
  setupRecurringEvent,
  setupRefundPolicy,
  processRefund,
  approveRefund
} = eventController;
const {
  authenticate,
  verifyCreator,
  verifyEventCreator,
  authorize
} = require('../middleware/auth');
const { eventUpload, handleUploadError } = require('../utils/uploadConfig');
const analyticsMiddleware = require('../middleware/analyticsMiddleware');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const { eventValidation, additionalFeatureValidation } = require('../middleware/validationMiddleware');

// Buat upload middleware untuk event (image dan banner)
const eventUploadMiddleware = uploadMiddleware.uploadEventImages;

// Rute publik (tanpa autentikasi)
router.get('/', getEvents);
router.get('/search', eventController.searchEvents);
router.get('/short/:shortLink', getEventByShortLink);
router.get('/:eventId', analyticsMiddleware.trackEventView, getEventById);

// Rute yang memerlukan autentikasi
router.use(authenticate);

// Rute untuk pembuatan dan pengelolaan event oleh creator
router.post(
  '/',
  verifyCreator,
  eventUploadMiddleware,
  handleUploadError,
  [
    body('title').notEmpty().withMessage('Judul event wajib diisi'),
    body('description').notEmpty().withMessage('Deskripsi event wajib diisi'),
    body('date').notEmpty().isDate().withMessage('Tanggal event tidak valid'),
    body('time').notEmpty().withMessage('Waktu event wajib diisi'),
    body('location').notEmpty().withMessage('Lokasi event wajib diisi'),
    body('category').notEmpty().withMessage('Kategori event wajib diisi'),
    body('organizer').notEmpty().withMessage('Penyelenggara event wajib diisi'),
    body('totalTickets')
      .isInt({
        min: 1
      })
      .withMessage('Jumlah tiket tidak valid'),
    body('price.regular')
      .isInt({
        min: 0
      })
      .withMessage('Harga tiket regular tidak valid'),
    body('price.student')
      .isInt({
        min: 0
      })
      .withMessage('Harga tiket student tidak valid'),
    body('ticketTypes').optional().isArray().withMessage('Format tipe tiket tidak valid'),
    body('ticketTypes.*.name').optional().notEmpty().withMessage('Nama tipe tiket wajib diisi'),
    body('ticketTypes.*.price')
      .optional()
      .isInt({
        min: 0
      })
      .withMessage('Harga tiket tidak valid'),
    body('ticketTypes.*.quantity')
      .optional()
      .isInt({
        min: 1
      })
      .withMessage('Jumlah tiket minimal 1')
  ],
  createEvent
);

router.put(
  '/:id',
  verifyEventCreator,
  eventUploadMiddleware,
  handleUploadError,
  [
    body('title').optional().notEmpty().withMessage('Judul event tidak boleh kosong'),
    body('description').optional().notEmpty().withMessage('Deskripsi event tidak boleh kosong'),
    body('date').optional().isISO8601().withMessage('Format tanggal tidak valid'),
    body('time').optional().notEmpty().withMessage('Waktu event tidak boleh kosong'),
    body('location').optional().notEmpty().withMessage('Lokasi event tidak boleh kosong'),
    body('category').optional().notEmpty().withMessage('Kategori event tidak boleh kosong'),
    body('organizer').optional().notEmpty().withMessage('Penyelenggara event tidak boleh kosong'),
    body('totalTickets')
      .optional()
      .isInt({
        min: 1
      })
      .withMessage('Jumlah tiket minimal 1'),
    body('price.regular')
      .optional()
      .isInt({
        min: 0
      })
      .withMessage('Harga tiket regular tidak valid'),
    body('price.student')
      .optional()
      .isInt({
        min: 0
      })
      .withMessage('Harga tiket student tidak valid'),
    body('ticketTypes').optional().isArray().withMessage('Format tipe tiket tidak valid'),
    body('ticketTypes.*.name').optional().notEmpty().withMessage('Nama tipe tiket wajib diisi'),
    body('ticketTypes.*.price')
      .optional()
      .isInt({
        min: 0
      })
      .withMessage('Harga tiket tidak valid'),
    body('ticketTypes.*.quantity')
      .optional()
      .isInt({
        min: 1
      })
      .withMessage('Jumlah tiket minimal 1')
  ],
  updateEvent
);

router.post(
  '/ticket-types',
  verifyCreator,
  [
    body('eventId').notEmpty().withMessage('ID event wajib diisi'),
    body('ticketTypes')
      .isArray({
        min: 1
      })
      .withMessage('Minimal 1 tipe tiket diperlukan'),
    body('ticketTypes.*.name').notEmpty().withMessage('Nama tipe tiket wajib diisi'),
    body('ticketTypes.*.description').optional(),
    body('ticketTypes.*.price')
      .isInt({
        min: 0
      })
      .withMessage('Harga tiket tidak valid'),
    body('ticketTypes.*.quantity')
      .isInt({
        min: 1
      })
      .withMessage('Jumlah tiket minimal 1'),
    body('ticketTypes.*.benefits').optional().isArray().withMessage('Benefits harus berupa array'),
    body('ticketTypes.*.isActive').optional().isBoolean().withMessage('Status aktif harus boolean')
  ],
  manageTicketTypes
);

router.delete('/:id', verifyCreator, deleteEvent);
router.get('/my-events', getMyEvents);
router.post('/:id/tickets', verifyEventCreator, manageTicketTypes);
router.post('/:id/shortlink', verifyEventCreator, generateEventShortLink);

// Rute untuk persetujuan event (hanya admin)
router.post('/:eventId/approve', authorize(['admin']), approveEvent);
router.post('/:eventId/reject', authorize(['admin']), rejectEvent);

// Rute untuk fitur lanjutan event
router.post(
  '/:eventId/ticket-types/:ticketTypeId/early-bird',
  authorize(['creator', 'admin']),
  enableEarlyBird
);
router.post('/:eventId/promo-codes', authorize(['creator', 'admin']), addPromoCode);
router.post('/:eventId/waiting-list/enable', authorize(['creator', 'admin']), enableWaitingList);
router.post('/:eventId/waiting-list/join', addToWaitingList);
router.post('/:eventId/recurring', authorize(['creator', 'admin']), setupRecurringEvent);
router.post('/:eventId/refund-policy', authorize(['creator', 'admin']), setupRefundPolicy);
router.post('/tickets/:ticketId/refund', processRefund);
router.post('/refunds/:refundId/approve', authorize(['admin']), approveRefund);

// Ekspor router
module.exports = router;
