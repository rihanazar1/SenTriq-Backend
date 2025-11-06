const asyncHandler = require('express-async-handler');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/userSchema');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = verifyToken(token);

    // Get user from token
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No user found with this token'
      });
    }

    // Check if user account is deactivated
    if (req.user.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated. Please contact support.',
        accountDeactivated: true
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }
});

module.exports = { protect };