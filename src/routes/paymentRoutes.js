const express = require("express");
const {
  handleMidtransNotification,
  getTransactionStatus
} = require("../controllers/ticketController");
const { authenticate } = require("../middleware/auth");
const router = express.Router();

// Status transaksi
router.get("/status/:id", authenticate, getTransactionStatus);

// Notifikasi dari Midtrans
router.post("/notification", handleMidtransNotification);

module.exports = router;
