const express = require('express');
const { body } = require('express-validator');
const ticketController = require('../controllers/ticketController');
const { authenticate, checkRole } = require('../middleware/auth');
const { rateLimiters } = require('../middleware/rateLimiter');
const ticketValidationController = require('../controllers/ticketValidationController');
const router = express.Router();
const isValidatorRole = checkRole('creator', 'staff_creator', 'admin');
const { authMiddleware } = require('../middleware/authMiddleware');
const { ticketValidation } = require('../middleware/validationMiddleware');

// Public routes
router.get('/tickets/types/:eventId', ticketValidation.getTypes, ticketController.getTicketTypesByEventId);
router.get('/price-details/:ticketTypeId', ticketController.getPriceDetails);

// Protected routes
router.post('/tickets/purchase', authMiddleware.authenticateJWT, ticketController.purchaseTicket);
router.get('/tickets/my-tickets', authMiddleware.authenticateJWT, ticketController.getMyTickets);
router.get('/my-tickets', authMiddleware.authenticateJWT, ticketController.getMyTickets);
router.get('/tickets/check/:ticketId', authMiddleware.authenticateJWT, ticketController.checkTicket);
router.post('/tickets/validate/:ticketId', authMiddleware.authenticateJWT, ticketController.validateTicket);

// Ticket validation routes
router.post(
  '/validate',
  authenticate,
  isValidatorRole,
  rateLimiters.general,
  ticketValidationController.validateTicket
);
router.get(
  '/events/:eventId/check-in-stats',
  authenticate,
  isValidatorRole,
  rateLimiters.general,
  ticketValidationController.getEventCheckInStats
);

// Menambahkan endpoint yang belum ada
router.post('/validate-promo', authMiddleware.authenticateJWT, ticketController.validatePromoCode);

module.exports = router;
