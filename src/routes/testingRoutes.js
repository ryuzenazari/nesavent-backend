const express = require('express');
const router = express.Router();

/**
 * Rute ini digunakan hanya untuk pengujian saat dalam mode development.
 * TIDAK DIGUNAKAN UNTUK PRODUCTION.
 */

// Endpoint pengujian dasar
router.get('/ping', (req, res) => {
  return res.status(200).json({ message: 'pong', timestamp: Date.now() });
});

// Endpoint untuk pengujian kesalahan
router.get('/error-test', (req, res, next) => {
  const error = new Error('Ini adalah error uji');
  error.status = 400;
  next(error);
});

module.exports = router; 