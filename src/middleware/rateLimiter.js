const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');

// Create rate limiter for app risk checking
const createAppRiskLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each user to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many risk assessment requests. Please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
    }
  });
};

// Create rate limiter for authentication endpoints
const createAuthLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 5 requests per windowMs for auth
    message: {
      success: false,
      error: 'Too many authentication attempts. Please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  });
};

// Create rate limiter for general API endpoints
const createGeneralLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

module.exports = {
  createAppRiskLimiter,
  createAuthLimiter,
  createGeneralLimiter
};