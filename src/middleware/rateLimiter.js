const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 100, 
  standardHeaders: true, 
  legacyHeaders: false, 
  message: {
    status: 429,
    message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi setelah 1 menit'
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit terlampaui untuk IP: ${req.ip}`, {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method
    });
    res.status(options.statusCode).json(options.message);
  }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Terlalu banyak percobaan login, silakan coba lagi setelah 15 menit'
  },
  handler: (req, res, next, options) => {
    logger.warn(`Authentication rate limit terlampaui untuk IP: ${req.ip}`, {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method
    });
    res.status(options.statusCode).json(options.message);
  }
});
module.exports = {
  generalLimiter,
  authLimiter
}; 