const redis = require('redis');

let redisClient = null;
let redisAvailable = false;
let connectionAttempted = false;

const connectRedis = async () => {
  // Only attempt connection once to avoid spam
  if (connectionAttempted) {
    return redisClient;
  }
  
  connectionAttempted = true;
  
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000, // 5 second timeout
        lazyConnect: true,
        reconnectStrategy: false // Disable automatic reconnection
      }
    });

    // Suppress error logging for connection refused (expected when Redis not running)
    redisClient.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        // Silently handle connection refused - this is expected when Redis is not running
        redisAvailable = false;
      } else {
        console.warn('Redis error:', err.message);
      }
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      redisAvailable = true;
    });

    redisClient.on('disconnect', () => {
      console.log('⚠️  Redis disconnected');
      redisAvailable = false;
    });

    // Try to connect with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]);

    redisAvailable = true;
    return redisClient;
  } catch (error) {
    // Don't log connection refused errors - they're expected when Redis isn't running
    if (error.code !== 'ECONNREFUSED' && !error.message.includes('ECONNREFUSED')) {
      console.warn('⚠️  Redis connection failed:', error.message);
    }
    redisAvailable = false;
    redisClient = null;
    return null;
  }
};

const getRedisClient = () => {
  return redisAvailable ? redisClient : null;
};

const isRedisAvailable = () => {
  return redisAvailable && redisClient && redisClient.isOpen;
};

// Cache helper functions with improved error handling
const setCache = async (key, value, ttlSeconds = 3600) => {
  try {
    if (isRedisAvailable()) {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    }
  } catch (error) {
    // Silently fail if Redis is not available
    redisAvailable = false;
  }
  return false;
};

const getCache = async (key) => {
  try {
    if (isRedisAvailable()) {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    }
  } catch (error) {
    // Silently fail if Redis is not available
    redisAvailable = false;
  }
  return null;
};

const deleteCache = async (key) => {
  try {
    if (isRedisAvailable()) {
      await redisClient.del(key);
      return true;
    }
  } catch (error) {
    // Silently fail if Redis is not available
    redisAvailable = false;
  }
  return false;
};

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisAvailable,
  setCache,
  getCache,
  deleteCache
};