const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');
const logger = require('../utils/logger');

let client;
let redisAvailable = false;

// Coba setup Redis hanya jika konfigurasi tersedia
if (process.env.REDIS_URL) {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    client.on('error', (err) => {
      logger.error('Redis client error:', err);
      redisAvailable = false;
    });

    client.on('connect', () => {
      logger.info('Redis connected successfully');
      redisAvailable = true;
    });

    // Coba connect tapi jangan block aplikasi jika gagal
    client.connect().catch(err => {
      logger.error('Redis connection failed:', err);
      redisAvailable = false;
    });
  } catch (error) {
    logger.error('Redis initialization failed:', error);
    redisAvailable = false;
  }
} else {
  logger.info('REDIS_URL not provided, using memory store for rate limiting');
}

const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
    keyGenerator = (req) => req.ip
  } = options;

  const config = {
    windowMs,
    max,
    message,
    standardHeaders,
    legacyHeaders,
    keyGenerator
  };

  // Gunakan Redis store hanya jika Redis tersedia
  if (client && redisAvailable) {
    try {
      config.store = new RedisStore({
        sendCommand: (...args) => client.sendCommand(args),
        prefix: 'ratelimit:'
      });
      logger.info('Using Redis store for rate limiting');
    } catch (error) {
      logger.error('Failed to create Redis store, falling back to memory store:', error);
    }
  } else {
    logger.info('Using memory store for rate limiting');
  }

  return rateLimit(config);
};

const endpointLimiters = {
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many authentication attempts, please try again later.'
  }),
  
  register: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many accounts created from this IP, please try again after an hour.'
  }),
  
  events: createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 200
  }),
  
  tickets: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Too many ticket-related requests, please try again later.'
  }),
  
  payments: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many payment-related requests, please try again later.'
  }),
  
  profile: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 60
  }),
  
  uploads: createRateLimiter({
    windowMs: 30 * 60 * 1000,
    max: 20,
    message: 'Too many file uploads from this IP, please try again later.'
  }),
  
  general: createRateLimiter()
};

const ipWhitelist = new Set(['127.0.0.1', '::1']);

module.exports = {
  createRateLimiter,
  rateLimiters: endpointLimiters
};
