const express = require('express');
const { body } = require('express-validator');
const { authenticate, verifyTicketChecker } = require('../middleware/auth');
const ticketValidationController = require('../controllers/ticketValidationController');
const staffController = require('../controllers/staffController');
const router = express.Router();
router.use(authenticate);
router.get('/dashboard', staffController.getDashboard);
router.post(
  '/tickets/validate',
  verifyTicketChecker,
  [
    body('qrData').notEmpty().withMessage('Data QR code wajib diisi'),
    body('scanLocation').optional().isString().withMessage('Lokasi scan harus berupa string')
  ],
  ticketValidationController.validateTicket
);
router.get(
  '/tickets/stats/:eventId',
  verifyTicketChecker,
  ticketValidationController.getEventCheckInStats
);
module.exports = router; 