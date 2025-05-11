const { body, query, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const responseFormatter = require('../utils/responseFormatter');

// Fungsi helper untuk memvalidasi ID MongoDB
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

// Fungsi helper untuk menampilkan pesan error
const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return responseFormatter.validationError(res, "Validasi gagal", errors.array());
  }
  next();
};

// Validasi untuk endpoint Event
const eventValidation = {
  create: [
    body('title')
      .notEmpty().withMessage('Judul event wajib diisi')
      .isLength({ min: 5, max: 100 }).withMessage('Judul event harus antara 5-100 karakter'),
    
    body('description')
      .notEmpty().withMessage('Deskripsi event wajib diisi')
      .isLength({ min: 20, max: 5000 }).withMessage('Deskripsi event harus antara 20-5000 karakter'),
    
    body('date')
      .notEmpty().withMessage('Tanggal event wajib diisi')
      .isISO8601().withMessage('Format tanggal tidak valid')
      .custom((value) => {
        const eventDate = new Date(value);
        const currentDate = new Date();
        if (eventDate < currentDate) {
          throw new Error('Tanggal event tidak boleh lebih awal dari hari ini');
        }
        return true;
      }),
    
    body('time')
      .notEmpty().withMessage('Waktu event wajib diisi')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format waktu tidak valid (HH:MM)'),
    
    body('location')
      .notEmpty().withMessage('Lokasi event wajib diisi')
      .isLength({ min: 5, max: 200 }).withMessage('Lokasi event harus antara 5-200 karakter'),
    
    body('category')
      .notEmpty().withMessage('Kategori event wajib diisi'),
    
    body('organizer')
      .notEmpty().withMessage('Penyelenggara event wajib diisi')
      .isLength({ min: 3, max: 100 }).withMessage('Nama penyelenggara harus antara 3-100 karakter'),
    
    body('totalTickets')
      .notEmpty().withMessage('Jumlah tiket wajib diisi')
      .isInt({ min: 1 }).withMessage('Jumlah tiket minimal 1'),
    
    body('price')
      .notEmpty().withMessage('Harga tiket wajib diisi')
      .isInt({ min: 0 }).withMessage('Harga tiket tidak boleh negatif'),
    
    body('ticketTypes')
      .optional()
      .isArray().withMessage('Tipe tiket harus berupa array'),
    
    body('ticketTypes.*.name')
      .notEmpty().withMessage('Nama tipe tiket wajib diisi')
      .isLength({ min: 2, max: 50 }).withMessage('Nama tipe tiket harus antara 2-50 karakter'),
    
    body('ticketTypes.*.price')
      .notEmpty().withMessage('Harga tipe tiket wajib diisi')
      .isInt({ min: 0 }).withMessage('Harga tipe tiket tidak boleh negatif'),
    
    body('ticketTypes.*.quantity')
      .notEmpty().withMessage('Jumlah tipe tiket wajib diisi')
      .isInt({ min: 1 }).withMessage('Jumlah tipe tiket minimal 1'),
    
    validationErrorHandler
  ],
  
  update: [
    param('id')
      .custom(isValidObjectId).withMessage('ID event tidak valid'),
    
    body('title')
      .optional()
      .isLength({ min: 5, max: 100 }).withMessage('Judul event harus antara 5-100 karakter'),
    
    body('description')
      .optional()
      .isLength({ min: 20, max: 5000 }).withMessage('Deskripsi event harus antara 20-5000 karakter'),
    
    body('date')
      .optional()
      .isISO8601().withMessage('Format tanggal tidak valid')
      .custom((value) => {
        const eventDate = new Date(value);
        const currentDate = new Date();
        if (eventDate < currentDate) {
          throw new Error('Tanggal event tidak boleh lebih awal dari hari ini');
        }
        return true;
      }),
    
    body('time')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format waktu tidak valid (HH:MM)'),
    
    body('location')
      .optional()
      .isLength({ min: 5, max: 200 }).withMessage('Lokasi event harus antara 5-200 karakter'),
    
    body('totalTickets')
      .optional()
      .isInt({ min: 1 }).withMessage('Jumlah tiket minimal 1'),
    
    body('price')
      .optional()
      .isInt({ min: 0 }).withMessage('Harga tiket tidak boleh negatif'),
    
    body('ticketTypes')
      .optional()
      .isArray().withMessage('Tipe tiket harus berupa array'),
    
    body('ticketTypes.*.name')
      .optional()
      .isLength({ min: 2, max: 50 }).withMessage('Nama tipe tiket harus antara 2-50 karakter'),
    
    body('ticketTypes.*.price')
      .optional()
      .isInt({ min: 0 }).withMessage('Harga tipe tiket tidak boleh negatif'),
    
    body('ticketTypes.*.quantity')
      .optional()
      .isInt({ min: 1 }).withMessage('Jumlah tipe tiket minimal 1'),
    
    validationErrorHandler
  ],
  
  getById: [
    param('eventId')
      .custom(isValidObjectId).withMessage('ID event tidak valid'),
    
    validationErrorHandler
  ],
  
  delete: [
    param('id')
      .custom(isValidObjectId).withMessage('ID event tidak valid'),
    
    validationErrorHandler
  ],
  
  getAll: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Halaman harus berupa angka minimal 1'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Batas per halaman harus antara 1-100'),
    
    query('search')
      .optional()
      .isLength({ min: 1, max: 100 }).withMessage('Kata kunci pencarian terlalu panjang'),
    
    query('startDate')
      .optional()
      .isISO8601().withMessage('Format tanggal mulai tidak valid'),
    
    query('endDate')
      .optional()
      .isISO8601().withMessage('Format tanggal akhir tidak valid'),
    
    validationErrorHandler
  ]
};

// Validasi untuk endpoint Ticket
const ticketValidation = {
  getTypes: [
    param('eventId')
      .custom(isValidObjectId).withMessage('ID event tidak valid'),
    
    validationErrorHandler
  ],
  
  manageTypes: [
    body('eventId')
      .notEmpty().withMessage('ID event wajib diisi')
      .custom(isValidObjectId).withMessage('ID event tidak valid'),
    
    body('ticketTypes')
      .isArray().withMessage('Tipe tiket harus berupa array')
      .notEmpty().withMessage('Tipe tiket tidak boleh kosong'),
    
    body('ticketTypes.*.name')
      .notEmpty().withMessage('Nama tipe tiket wajib diisi')
      .isLength({ min: 2, max: 50 }).withMessage('Nama tipe tiket harus antara 2-50 karakter'),
    
    body('ticketTypes.*.price')
      .notEmpty().withMessage('Harga tipe tiket wajib diisi')
      .isInt({ min: 0 }).withMessage('Harga tipe tiket tidak boleh negatif'),
    
    body('ticketTypes.*.quantity')
      .notEmpty().withMessage('Jumlah tipe tiket wajib diisi')
      .isInt({ min: 1 }).withMessage('Jumlah tipe tiket minimal 1'),
    
    validationErrorHandler
  ]
};

// Validasi untuk endpoint Rating
const ratingValidation = {
  getEventRatings: [
    param('eventId')
      .custom(isValidObjectId).withMessage('ID event tidak valid'),
    
    validationErrorHandler
  ],
  
  createRating: [
    body('eventId')
      .notEmpty().withMessage('ID event wajib diisi')
      .custom(isValidObjectId).withMessage('ID event tidak valid'),
    
    body('rating')
      .notEmpty().withMessage('Rating wajib diisi')
      .isFloat({ min: 1, max: 5 }).withMessage('Rating harus antara 1-5'),
    
    body('review')
      .optional()
      .isLength({ min: 5, max: 1000 }).withMessage('Ulasan harus antara 5-1000 karakter'),
    
    validationErrorHandler
  ]
};

// Validasi untuk fitur tambahan
const additionalFeatureValidation = {
  earlyBird: [
    param('eventId')
      .custom(isValidObjectId).withMessage('ID event tidak valid'),
    
    param('ticketTypeId')
      .custom(isValidObjectId).withMessage('ID tipe tiket tidak valid'),
    
    body('earlyBirdPrice')
      .notEmpty().withMessage('Harga early bird wajib diisi')
      .isInt({ min: 0 }).withMessage('Harga early bird tidak boleh negatif'),
    
    body('startDate')
      .notEmpty().withMessage('Tanggal mulai early bird wajib diisi')
      .isISO8601().withMessage('Format tanggal mulai tidak valid'),
    
    body('endDate')
      .notEmpty().withMessage('Tanggal akhir early bird wajib diisi')
      .isISO8601().withMessage('Format tanggal akhir tidak valid')
      .custom((value, { req }) => {
        const startDate = new Date(req.body.startDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('Tanggal akhir harus setelah tanggal mulai');
        }
        return true;
      }),
    
    body('quota')
      .notEmpty().withMessage('Kuota early bird wajib diisi')
      .isInt({ min: 1 }).withMessage('Kuota early bird minimal 1'),
    
    validationErrorHandler
  ],
  
  promoCode: [
    param('eventId')
      .custom(isValidObjectId).withMessage('ID event tidak valid'),
    
    body('code')
      .notEmpty().withMessage('Kode promo wajib diisi')
      .isLength({ min: 3, max: 20 }).withMessage('Kode promo harus antara 3-20 karakter')
      .matches(/^[A-Z0-9]+$/).withMessage('Kode promo hanya boleh berisi huruf kapital dan angka'),
    
    body('discount')
      .notEmpty().withMessage('Nilai diskon wajib diisi')
      .isFloat({ min: 0.1 }).withMessage('Nilai diskon harus lebih dari 0'),
    
    body('discountType')
      .notEmpty().withMessage('Tipe diskon wajib diisi')
      .isIn(['percentage', 'fixed']).withMessage('Tipe diskon harus percentage atau fixed'),
    
    body('maxUsage')
      .notEmpty().withMessage('Maksimum penggunaan wajib diisi')
      .isInt({ min: 1 }).withMessage('Maksimum penggunaan minimal 1'),
    
    body('startDate')
      .notEmpty().withMessage('Tanggal mulai promo wajib diisi')
      .isISO8601().withMessage('Format tanggal mulai tidak valid'),
    
    body('endDate')
      .notEmpty().withMessage('Tanggal akhir promo wajib diisi')
      .isISO8601().withMessage('Format tanggal akhir tidak valid')
      .custom((value, { req }) => {
        const startDate = new Date(req.body.startDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('Tanggal akhir harus setelah tanggal mulai');
        }
        return true;
      }),
    
    body('applicableTickets')
      .notEmpty().withMessage('Tiket yang berlaku wajib diisi')
      .isArray().withMessage('Tiket yang berlaku harus berupa array')
      .custom((value) => {
        for (const ticketId of value) {
          if (!isValidObjectId(ticketId)) {
            throw new Error('ID tiket tidak valid');
          }
        }
        return true;
      }),
    
    validationErrorHandler
  ],
  
  waitingList: {
    enable: [
      param('eventId')
        .custom(isValidObjectId).withMessage('ID event tidak valid'),
      
      body('maxCapacity')
        .notEmpty().withMessage('Kapasitas maksimum waiting list wajib diisi')
        .isInt({ min: 1 }).withMessage('Kapasitas maksimum waiting list minimal 1'),
      
      validationErrorHandler
    ],
    
    addToWaitingList: [
      param('eventId')
        .custom(isValidObjectId).withMessage('ID event tidak valid'),
      
      body('ticketType')
        .notEmpty().withMessage('Tipe tiket wajib diisi')
        .custom(isValidObjectId).withMessage('ID tipe tiket tidak valid'),
      
      body('quantity')
        .notEmpty().withMessage('Jumlah tiket wajib diisi')
        .isInt({ min: 1, max: 10 }).withMessage('Jumlah tiket harus antara 1-10'),
      
      validationErrorHandler
    ]
  },
  
  shortLink: [
    param('id')
      .custom(isValidObjectId).withMessage('ID event tidak valid'),
    
    validationErrorHandler
  ],
  
  refundPolicy: [
    param('eventId')
      .custom(isValidObjectId).withMessage('ID event tidak valid'),
    
    body('isRefundable')
      .isBoolean().withMessage('Status refundable harus boolean'),
    
    body('refundDeadlineDays')
      .notEmpty().withMessage('Batas hari refund wajib diisi')
      .isInt({ min: 1 }).withMessage('Batas hari refund minimal 1'),
    
    body('refundPercentage')
      .notEmpty().withMessage('Persentase refund wajib diisi')
      .isInt({ min: 1, max: 100 }).withMessage('Persentase refund harus antara 1-100'),
    
    body('termsAndConditions')
      .notEmpty().withMessage('Syarat dan ketentuan wajib diisi')
      .isLength({ min: 10 }).withMessage('Syarat dan ketentuan terlalu pendek'),
    
    validationErrorHandler
  ],
  
  approveEvent: [
    param('eventId')
      .custom(isValidObjectId).withMessage('ID event tidak valid'),
    
    validationErrorHandler
  ],
  
  rejectEvent: [
    param('eventId')
      .custom(isValidObjectId).withMessage('ID event tidak valid'),
    
    body('reason')
      .optional()
      .isString().withMessage('Alasan penolakan harus berupa teks'),
    
    validationErrorHandler
  ],
  
  processRefund: [
    param('ticketId')
      .custom(isValidObjectId).withMessage('ID tiket tidak valid'),
    
    body('reason')
      .optional()
      .isString().withMessage('Alasan refund harus berupa teks'),
    
    validationErrorHandler
  ],
  
  approveRefund: [
    param('refundId')
      .custom(isValidObjectId).withMessage('ID refund tidak valid'),
    
    validationErrorHandler
  ]
};

module.exports = {
  eventValidation,
  ticketValidation,
  ratingValidation,
  additionalFeatureValidation,
  validationErrorHandler
}; 