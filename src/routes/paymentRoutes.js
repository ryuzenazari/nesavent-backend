const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Comment: Tidak ada fungsi getTransactionStatus dan handleMidtransNotification di ticketController

// Menambahkan rute untuk riwayat pembayaran
router.get('/history', authMiddleware.authenticateJWT, paymentController.getPaymentHistory);

module.exports = router;
