const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');

// Track event view middleware
exports.trackEventView = async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user ? req.user._id : null;
    
    // Lakukan tracking view secara asinkron tanpa mengganggu request utama
    analyticsService.trackEventView(eventId, userId)
      .catch(err => {
        logger.error(`Error tracking event view: ${err.message}`, { 
          eventId, 
          userId, 
          error: err.stack 
        });
      });
    
    next(); // Lanjutkan ke handler berikutnya
  } catch (error) {
    logger.error(`Analytics middleware error: ${error.message}`);
    next(); // Lanjutkan meskipun tracking gagal
  }
};

// Track ticket sale middleware
exports.trackTicketSale = async (req, res, next) => {
  try {
    const { eventId, ticketId, amount } = req.body.analyticsData || {};
    
    if (eventId && ticketId && amount) {
      // Lakukan tracking sale secara asinkron
      analyticsService.trackTicketSale(eventId, ticketId, amount)
        .catch(err => {
          logger.error(`Error tracking ticket sale: ${err.message}`, { 
            eventId, 
            ticketId, 
            amount,
            error: err.stack 
          });
        });
    }
    
    next();
  } catch (error) {
    logger.error(`Analytics middleware error: ${error.message}`);
    next(); // Lanjutkan meskipun tracking gagal
  }
};

// Middleware untuk mencatat aktivitas user
exports.trackUserActivity = (activityType) => {
  return (req, res, next) => {
    try {
      const userId = req.user ? req.user._id : null;
      if (!userId) return next();
      
      const data = {
        userId,
        type: activityType,
        details: {
          url: req.originalUrl,
          method: req.method,
          timestamp: new Date()
        }
      };
      
      // Implementasi tracking user activity akan ditambahkan nanti
      logger.info(`User activity tracked: ${activityType}`, { userId });
      
      next();
    } catch (error) {
      logger.error(`User activity tracking error: ${error.message}`);
      next();
    }
  };
};

// Export semua middleware
module.exports = exports;
