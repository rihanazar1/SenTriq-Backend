// utils/jwt.js
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (user) => {
  const payload = {
    id: user.id || user._id,
    email: user.email,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const generateRefreshToken = (user) => {
  const payload = {
    id: user.id || user._id,
    email: user.email,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '14d',
  });
};

// Verify JWT Token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
};
