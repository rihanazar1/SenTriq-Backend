const express = require('express');
const { 
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
} = require('../controllers/auth.Controller');
const { protect } = require('../middleware/auth');
// const { optionalAuth } = require('../middleware/optionalAuth');
const validate = require('../middleware/validation');
const { 
  registerValidationSchema, 
  loginValidationSchema, 
  updateValidationSchema, 
  changePasswordSchema,
  sendResetCodeSchema,
  verifyResetCodeSchema,
  resetPasswordWithCodeSchema
} = require('../validations/userValidation');

const router = express.Router();

// Public routes
router.post('/register', validate(registerValidationSchema), register);
router.post('/login', validate(loginValidationSchema), login);
router.post('/send-reset-code', validate(sendResetCodeSchema), sendResetCode);
router.post('/verify-reset-code', validate(verifyResetCodeSchema), verifyResetCode);
router.post('/reset-password', validate(resetPasswordWithCodeSchema), resetPasswordWithCode);

// Dynamic profile route - works with or without authentication
router.get('/profile', protect, getProfile);

// Protected routes
router.put('/update-profile', protect, validate(updateValidationSchema), updateProfile);
router.put('/change-password', protect, validate(changePasswordSchema), changePassword);
router.delete('/delete-profile', protect, deleteAccount);
router.get('/dashboard', protect, getDashboard);
router.post('/refresh-token', protect, refreshToken);

// Keep the old /me route for backward compatibility (protected)
router.get('/me', protect, getProfile);

// Admin routes
router.get('/admin/users', protect, getAllUsers);
router.patch('/admin/users/:userId/toggle-status', protect, toggleUserStatus);
router.patch('/admin/users/:userId/restore', protect, restoreUser);
router.delete('/admin/users/:userId/permanent-delete', protect, permanentDeleteUser);

module.exports = router;