const express = require('express');
const { body } = require('express-validator');
const ticketController = require('../controllers/ticketController');
const { authenticate, checkRole } = require('../middleware/auth');
const { generalLimiter, authLimiter } = require('../middleware/rateLimiter');
const ticketValidationController = require('../controllers/ticketValidationController');
const router = express.Router();
const isValidatorRole = checkRole('creator', 'staff_creator', 'admin');
router.post(
  '/',
  authenticate,
  generalLimiter,
  [
    body('eventId').notEmpty().withMessage('Event ID wajib diisi'),
    body('ticketType')
      .optional() 
      .custom((value, { req }) => {
        if (!req.body.ticketTypeId && !value) {
          throw new Error('Tipe tiket wajib diisi jika tidak menggunakan ID tipe tiket');
        }
        if (value && !['regular', 'student'].includes(value)) {
          throw new Error('Tipe tiket tidak valid');
        }
        return true;
      }),
    body('ticketTypeId')
      .optional() 
      .isMongoId().withMessage('ID tipe tiket tidak valid'),
    body('quantity').isInt({ min: 1, max: 10 }).withMessage('Jumlah tiket harus antara 1-10')
  ],
  ticketController.purchaseTicket
);
router.get('/', authenticate, ticketController.getUserTickets);
router.get('/:id', authenticate, ticketController.getTicketById);
router.put('/:id/cancel', authenticate, ticketController.cancelTicket);
router.post('/:id/transfer', 
  authenticate,
  generalLimiter,
  [
    body('recipientEmail')
      .isEmail()
      .withMessage('Email penerima tidak valid')
      .normalizeEmail()
  ],
  ticketController.transferTicket
);
router.post('/validate', 
  authenticate, 
  isValidatorRole, 
  generalLimiter, 
  ticketValidationController.validateTicket
);
router.get('/events/:eventId/check-in-stats',
  authenticate,
  isValidatorRole,
  generalLimiter,
  ticketValidationController.getEventCheckInStats
);
module.exports = router; 