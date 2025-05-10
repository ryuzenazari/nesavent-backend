const express = require('express');
const { body } = require('express-validator');
const { createEvent, getAllEvents, getEventById, updateEvent, deleteEvent, getMyEvents, manageTicketTypes, generateEventShortLink } = require('../controllers/eventController');
const { authenticate, verifyCreator, verifyEventCreator } = require('../middleware/auth');
const { eventUpload, handleUploadError } = require('../utils/uploadConfig');
const router = express.Router();
router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.use(authenticate);
router.post('/', 
  verifyCreator, 
  eventUpload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
  handleUploadError,
  [
    body('title').notEmpty().withMessage('Judul event wajib diisi'),
    body('description').notEmpty().withMessage('Deskripsi event wajib diisi'),
    body('date').notEmpty().isDate().withMessage('Tanggal event tidak valid'),
    body('time').notEmpty().withMessage('Waktu event wajib diisi'),
    body('location').notEmpty().withMessage('Lokasi event wajib diisi'),
    body('category').notEmpty().withMessage('Kategori event wajib diisi'),
    body('organizer').notEmpty().withMessage('Penyelenggara event wajib diisi'),
    body('totalTickets').isInt({ min: 1 }).withMessage('Jumlah tiket tidak valid'),
    body('price.regular').isInt({ min: 0 }).withMessage('Harga tiket regular tidak valid'),
    body('price.student').isInt({ min: 0 }).withMessage('Harga tiket student tidak valid'),
    body('ticketTypes').optional().isArray().withMessage('Format tipe tiket tidak valid'),
    body('ticketTypes.*.name').optional().notEmpty().withMessage('Nama tipe tiket wajib diisi'),
    body('ticketTypes.*.price').optional().isInt({ min: 0 }).withMessage('Harga tiket tidak valid'),
    body('ticketTypes.*.quantity').optional().isInt({ min: 1 }).withMessage('Jumlah tiket minimal 1')
  ], 
  createEvent
);
router.put('/:id', 
  verifyEventCreator, 
  eventUpload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
  handleUploadError,
  [
    body('title').optional().notEmpty().withMessage('Judul event tidak boleh kosong'),
    body('description').optional().notEmpty().withMessage('Deskripsi event tidak boleh kosong'),
    body('date').optional().isISO8601().withMessage('Format tanggal tidak valid'),
    body('time').optional().notEmpty().withMessage('Waktu event tidak boleh kosong'),
    body('location').optional().notEmpty().withMessage('Lokasi event tidak boleh kosong'),
    body('category').optional().notEmpty().withMessage('Kategori event tidak boleh kosong'),
    body('organizer').optional().notEmpty().withMessage('Penyelenggara event tidak boleh kosong'),
    body('totalTickets').optional().isInt({ min: 1 }).withMessage('Jumlah tiket minimal 1'),
    body('price.regular').optional().isInt({ min: 0 }).withMessage('Harga tiket regular tidak valid'),
    body('price.student').optional().isInt({ min: 0 }).withMessage('Harga tiket student tidak valid'),
    body('ticketTypes').optional().isArray().withMessage('Format tipe tiket tidak valid'),
    body('ticketTypes.*.name').optional().notEmpty().withMessage('Nama tipe tiket wajib diisi'),
    body('ticketTypes.*.price').optional().isInt({ min: 0 }).withMessage('Harga tiket tidak valid'),
    body('ticketTypes.*.quantity').optional().isInt({ min: 1 }).withMessage('Jumlah tiket minimal 1')
  ], 
  updateEvent
);
router.post('/ticket-types',
  verifyCreator, 
  [
    body('eventId').notEmpty().withMessage('ID event wajib diisi'),
    body('ticketTypes').isArray({ min: 1 }).withMessage('Minimal 1 tipe tiket diperlukan'),
    body('ticketTypes.*.name').notEmpty().withMessage('Nama tipe tiket wajib diisi'),
    body('ticketTypes.*.description').optional(),
    body('ticketTypes.*.price').isInt({ min: 0 }).withMessage('Harga tiket tidak valid'),
    body('ticketTypes.*.quantity').isInt({ min: 1 }).withMessage('Jumlah tiket minimal 1'),
    body('ticketTypes.*.benefits').optional().isArray().withMessage('Benefits harus berupa array'),
    body('ticketTypes.*.isActive').optional().isBoolean().withMessage('Status aktif harus boolean')
  ],
  manageTicketTypes
);
router.delete('/:id', 
  verifyCreator, 
  deleteEvent
);
router.get('/my-events', getMyEvents);
router.post('/:id/tickets', verifyEventCreator, manageTicketTypes);
router.post('/:id/shortlink', verifyEventCreator, generateEventShortLink);
module.exports = router; 