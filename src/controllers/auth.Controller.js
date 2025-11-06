const asyncHandler = require('express-async-handler');
const User = require('../models/userSchema');
const { generateToken, generateRefreshToken } = require('../utils/jwt');




const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({
      success: false,
      error: 'User already exists'
    });
  }

  const user = await User.create({
    name,
    email,
    password
  });

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    token,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});




const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide an email and password'
    });
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    token,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      role: user.role
    }
  });
});




const getProfile = asyncHandler(async (req, res) => {
  // Check if user is authenticated (token provided and valid)
  if (req.user) {
    // User is authenticated - return full profile
    return res.status(200).json({
      success: true,
      authenticated: true,
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt
      }
    });
  } else {
    // User is not authenticated - return public message
    return res.status(200).json({
      success: true,
      authenticated: false,
      message: 'Please login to view your profile',
      data: null
    });
  }
});




const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const userId = req.user._id;

  // Check if email is being changed and if it already exists
  if (email && email !== req.user.email) {
    const emailExists = await User.findOne({ email, _id: { $ne: userId } });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }
  }

  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      ...(name && { name }),
      ...(email && { email })
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    }
  });
});




const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  // Get user with password
  const user = await User.findById(userId).select('+password');

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      error: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
});





const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get user and soft delete
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Soft delete user account
  await user.softDelete();

  // Optionally soft delete user's apps as well
  const App = require('../models/appSchema');
  await App.updateMany({ userId }, { isActive: false });

  res.status(200).json({
    success: true,
    message: 'Account deleted successfully'
  });
});



const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get user statistics using aggregation pipeline
  const userStats = await User.getUserDashboardStats(userId);

  res.status(200).json({
    success: true,
    data: userStats
  });
});



const refreshToken = asyncHandler(async (req, res) => {
  // User is already authenticated via middleware
  const user = req.user;

  // Generate new token
  const newToken = generateRefreshToken(user);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    token: newToken,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// Send Password Reset Code
const sendResetCode = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'No user found with that email'
    });
  }

  // Generate reset code
  const resetCode = await user.generateResetPasswordCode();
  await user.save({ validateBeforeSave: false });

  // Send email with verification code
  const { sendVerificationCode } = require('../config/nodemailer');

  try {
    const emailResult = await sendVerificationCode(user.email, resetCode, user.name);

    if (emailResult.success) {
      res.status(200).json({
        success: true,
        message: 'Verification code sent to your email',
        // For development only - remove in production
        code: process.env.NODE_ENV === 'development' ? resetCode : undefined
      });
    } else {
      // Clear the reset code if email failed
      user.clearResetPasswordFields();
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email'
      });
    }
  } catch (error) {
    console.log(error);
    user.clearResetPasswordFields();
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      success: false,
      error: 'Email could not be sent'
    });
  }
});

// Verify Reset Code
const verifyResetCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email }).select('+resetPasswordCode +resetPasswordExpire');

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'No user found with that email'
    });
  }

  // Verify the code
  const isValidCode = await user.verifyResetPasswordCode(code);

  if (!isValidCode) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired verification code'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Verification code is valid',
    canResetPassword: true
  });
});

// Reset Password with Code
const resetPasswordWithCode = asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a new password'
    });
  }

  const user = await User.findOne({ email }).select('+resetPasswordCode +resetPasswordExpire');

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'No user found with that email'
    });
  }

  // Verify the code again
  const isValidCode = await user.verifyResetPasswordCode(code);

  if (!isValidCode) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired verification code'
    });
  }

  // Set new password and clear reset fields
  user.password = password;
  user.clearResetPasswordFields();
  await user.save();

  // Generate new JWT token
  const jwtToken = generateToken(user);

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    token: jwtToken,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});





// Admin Functions
const getAllUsers = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin()) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.'
    });
  }

  const { includeDeleted = false, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  let users;
  let total;

  if (includeDeleted === 'true') {
    users = await User.find({ isDeleted: { $in: [0, 1] } })
      .select('-password -resetPasswordCode -resetPasswordExpire')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    total = await User.countDocuments({ isDeleted: { $in: [0, 1] } });
  } else {
    users = await User.find()
      .select('-password -resetPasswordCode -resetPasswordExpire')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    total = await User.countDocuments({ isDeleted: 1 });
  }

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  });
});

const toggleUserStatus = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin()) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.'
    });
  }

  const { userId } = req.params;

  const user = await User.findOne({ _id: userId, isDeleted: { $in: [0, 1] } });
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      error: 'You cannot deactivate your own account'
    });
  }

  await user.toggleActiveStatus();

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      userId: user._id,
      isActive: user.isActive
    }
  });
});

const restoreUser = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin()) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.'
    });
  }

  const { userId } = req.params;

  const user = await User.findOne({ _id: userId, isDeleted: { $in: [0, 1] } });
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  if (user.isDeleted === 1) {
    return res.status(400).json({
      success: false,
      error: 'User is not deleted'
    });
  }

  await user.restore();

  res.status(200).json({
    success: true,
    message: 'User restored successfully',
    data: {
      userId: user._id,
      isDeleted: user.isDeleted
    }
  });
});

const permanentDeleteUser = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin()) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.'
    });
  }

  const { userId } = req.params;

  // Prevent admin from deleting themselves
  if (userId === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      error: 'You cannot delete your own account'
    });
  }

  const user = await User.findOne({ _id: userId, isDeleted: { $in: [0, 1] } });
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Delete user's apps permanently
  const App = require('../models/appSchema');
  await App.deleteMany({ userId });

  // Delete user permanently
  await User.findByIdAndDelete(userId);

  res.status(200).json({
    success: true,
    message: 'User permanently deleted'
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getDashboard,
  refreshToken,
  sendResetCode,
  verifyResetCode,
  resetPasswordWithCode,
  // Admin functions
  getAllUsers,
  toggleUserStatus,
  restoreUser,
  permanentDeleteUser
};