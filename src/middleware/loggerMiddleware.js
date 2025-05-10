const logger = require('../utils/logger');
const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  logger.info(`Menerima permintaan ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durasi: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    if (req.user) {
      logData.userId = req.user._id;
      logData.userEmail = req.user.email;
    }
    
    if (res.statusCode >= 400) {
      logger.error(`Error pemrosesan permintaan: ${req.method} ${req.originalUrl}`, logData);
    } else {
      logger.info(`Permintaan selesai: ${req.method} ${req.originalUrl}`, logData);
    }
  });
  
  next();
};
module.exports = loggerMiddleware; 