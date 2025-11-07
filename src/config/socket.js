const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/userSchema');

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        // Allow anonymous connections for reading comments
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      // Allow connection but mark as unauthenticated
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}${socket.user ? ` (User: ${socket.user.name})` : ' (Anonymous)'}`);

    // Join blog room
    socket.on('join_blog', (blogId) => {
      socket.join(`blog_${blogId}`);
      console.log(`Socket ${socket.id} joined blog room: blog_${blogId}`);
    });

    // Leave blog room
    socket.on('leave_blog', (blogId) => {
      socket.leave(`blog_${blogId}`);
      console.log(`Socket ${socket.id} left blog room: blog_${blogId}`);
    });

    // Typing indicator
    socket.on('typing', ({ blogId, userName }) => {
      socket.to(`blog_${blogId}`).emit('user_typing', { userName });
    });

    socket.on('stop_typing', ({ blogId }) => {
      socket.to(`blog_${blogId}`).emit('user_stop_typing');
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = initializeSocket;
