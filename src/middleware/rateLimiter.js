const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');
const logger = require('../utils/logger');

let client;

try {
  client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  client.on('error', (err) => {
    console.error('Redis client error:', err);
  });
} catch (error) {
  console.error('Redis connection failed:', error);
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

  if (client) {
    config.store = new RedisStore({
      sendCommand: (...args) => client.sendCommand(args),
      prefix: 'ratelimit:'
    });
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

const bypassRateLimit = (req, res, next) => {
  if (ipWhitelist.has(req.ip)) {
    return next();
  }
  return endpointLimiters.general(req, res, next);
};

module.exports = {
  createRateLimiter,
  rateLimiters: endpointLimiters,
  bypassRateLimit
};
