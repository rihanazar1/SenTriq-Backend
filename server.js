require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');
const { connectRedis } = require('./src/config/redis');

const PORT = process.env.PORT || 5000;

// Initialize connections
const initializeServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Connect to Redis (optional - server will work without it)
    const redisClient = await connectRedis();
    if (redisClient) {
      console.log('✅ Redis caching enabled');
    } else {
      console.log('⚠️  Redis not available, using in-memory cache fallback');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Initialize server
initializeServer();