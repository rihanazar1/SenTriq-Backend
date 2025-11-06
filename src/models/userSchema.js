const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      select: false, // Don’t include password by default
    },

    resetPasswordCode: {
      type: String,
      select: false,
    },

    resetPasswordExpire: {
      type: Date,
      select: false,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    isDeleted: {
      type: Number,
      default: 1, // 1 = active, 0 = deleted
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
    
    isActive: {
      type: Boolean,
      default: true, // Admin can activate/deactivate users
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset code
userSchema.methods.generateResetPasswordCode = async function () {
  // Generate 6-digit code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash code using bcrypt
  const salt = await bcrypt.genSalt(10);
  this.resetPasswordCode = await bcrypt.hash(resetCode, salt);

  // Set expire time (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetCode;
};

// Verify reset password code
userSchema.methods.verifyResetPasswordCode = async function (code) {
  if (!this.resetPasswordCode || !this.resetPasswordExpire) {
    return false;
  }

  // Check if code is expired
  if (Date.now() > this.resetPasswordExpire) {
    return false;
  }

  // Compare code with hashed version
  return await bcrypt.compare(code, this.resetPasswordCode);
};

// Clear reset password fields
userSchema.methods.clearResetPasswordFields = function () {
  this.resetPasswordCode = undefined;
  this.resetPasswordExpire = undefined;
};

// Soft delete user
userSchema.methods.softDelete = function () {
  this.isDeleted = 0;
  this.deletedAt = new Date();
  return this.save();
};

// Restore deleted user
userSchema.methods.restore = function () {
  this.isDeleted = 1;
  this.deletedAt = null;
  return this.save();
};

// Check if user is admin
userSchema.methods.isAdmin = function () {
  return this.role === 'admin';
};

// Activate/Deactivate user (admin only)
userSchema.methods.toggleActiveStatus = function () {
  this.isActive = !this.isActive;
  return this.save();
};

// Query middleware to exclude deleted users by default
userSchema.pre(/^find/, function (next) {
  // Only apply if isDeleted filter is not already set
  if (!this.getQuery().isDeleted) {
    this.find({ isDeleted: 1 });
  }
  next();
});

// Static method to find deleted users (admin only)
userSchema.statics.findDeleted = function () {
  return this.find({ isDeleted: 0 });
};

// Static method to find all users including deleted (admin only)
userSchema.statics.findWithDeleted = function (filter = {}) {
  return this.find({ ...filter, isDeleted: { $in: [0, 1] } });
};

// Static method to get user dashboard statistics
userSchema.statics.getUserDashboardStats = async function (userId) {
  const App = require('./appSchema');

  const [userInfo, appStats, riskDistribution, recentApps, highRiskApps] = await Promise.all([
    // Get basic user info
    this.findById(userId).select('name email createdAt'),

    // Get app statistics
    App.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
      {
        $group: {
          _id: null,
          totalApps: { $sum: 1 },
          avgRiskScore: { $avg: '$riskScore' },
          highRiskApps: {
            $sum: { $cond: [{ $gte: ['$riskScore', 51] }, 1, 0] }
          },
          criticalRiskApps: {
            $sum: { $cond: [{ $gte: ['$riskScore', 76] }, 1, 0] }
          },
          appsWithEmail: {
            $sum: { $cond: [{ $ne: ['$userEmail', null] }, 1, 0] }
          },
          appsWithPhone: {
            $sum: { $cond: [{ $ne: ['$userPhoneNumber', null] }, 1, 0] }
          }
        }
      }
    ]),

    // Get risk level distribution
    App.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 },
          apps: { $push: { name: '$appName', score: '$riskScore' } }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // Get recent apps (last 5)
    App.find({ userId, isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('appName riskScore riskLevel createdAt'),

    // Get highest risk apps
    App.find({ userId, isActive: true })
      .sort({ riskScore: -1 })
      .limit(5)
      .select('appName riskScore riskLevel userEmail userPhoneNumber permissions')
  ]);

  return {
    user: userInfo,
    statistics: appStats[0] || {
      totalApps: 0,
      avgRiskScore: 0,
      highRiskApps: 0,
      criticalRiskApps: 0,
      appsWithEmail: 0,
      appsWithPhone: 0
    },
    riskDistribution,
    recentApps,
    highRiskApps
  };
};

// // Static method to get user's privacy exposure summary
// userSchema.statics.getPrivacyExposure = async function (userId) {
//   const App = require('./appSchema');

//   return await App.aggregate([
//     { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
//     {
//       $group: {
//         _id: null,
//         totalApps: { $sum: 1 },
//         emailExposure: {
//           $sum: { $cond: [{ $ne: ['$userEmail', null] }, 1, 0] }
//         },
//         phoneExposure: {
//           $sum: { $cond: [{ $ne: ['$userPhoneNumber', null] }, 1, 0] }
//         },
//         locationAccess: {
//           $sum: { $cond: ['$permissions.locationAccess', 1, 0] }
//         },
//         cameraAccess: {
//           $sum: { $cond: ['$permissions.cameraMicrophoneAccess', 1, 0] }
//         },
//         smsAccess: {
//           $sum: { $cond: ['$permissions.smsAccess', 1, 0] }
//         },
//         contactsAccess: {
//           $sum: { $cond: ['$permissions.contactsAccess', 1, 0] }
//         },
//         paymentAccess: {
//           $sum: { $cond: ['$permissions.paymentInfoAccess', 1, 0] }
//         },
//         healthAccess: {
//           $sum: { $cond: ['$permissions.healthDataAccess', 1, 0] }
//         },
//         avgRiskScore: { $avg: '$riskScore' },
//         maxRiskScore: { $max: '$riskScore' }
//       }
//     },
//     {
//       $project: {
//         _id: 0,
//         totalApps: 1,
//         privacyExposure: {
//           emailSharedWith: '$emailExposure',
//           phoneSharedWith: '$phoneExposure',
//           locationAccessApps: '$locationAccess',
//           cameraAccessApps: '$cameraAccess',
//           smsAccessApps: '$smsAccess',
//           contactsAccessApps: '$contactsAccess',
//           paymentAccessApps: '$paymentAccess',
//           healthAccessApps: '$healthAccess'
//         },
//         riskMetrics: {
//           averageRiskScore: { $round: ['$avgRiskScore', 1] },
//           highestRiskScore: '$maxRiskScore',
//           privacyRiskLevel: {
//             $switch: {
//               branches: [
//                 { case: { $gte: ['$avgRiskScore', 76] }, then: 'Critical' },
//                 { case: { $gte: ['$avgRiskScore', 51] }, then: 'High' },
//                 { case: { $gte: ['$avgRiskScore', 21] }, then: 'Medium' },
//               ],
//               default: 'Low'
//             }
//           }
//         }
//       }
//     }
//   ]);
// };

// // Static method to get apps by permission type
// userSchema.statics.getAppsByPermission = async function (userId, permissionType) {
//   const App = require('./appSchema');

//   const matchCondition = { userId: new mongoose.Types.ObjectId(userId), isActive: true };

//   // Handle different permission types
//   if (permissionType === 'email') {
//     matchCondition.userEmail = { $ne: null };
//   } else if (permissionType === 'phone') {
//     matchCondition.userPhoneNumber = { $ne: null };
//   } else {
//     matchCondition[`permissions.${permissionType}`] = true;
//   }

//   return await App.find(matchCondition)
//     .select('appName riskScore riskLevel userEmail userPhoneNumber permissions createdAt')
//     .sort({ riskScore: -1 });
// };

// // Static method to get user's risk timeline
// userSchema.statics.getRiskTimeline = async function (userId, days = 30) {
//   const App = require('./appSchema');

//   const startDate = new Date();
//   startDate.setDate(startDate.getDate() - days);

//   return await App.aggregate([
//     {
//       $match: {
//         userId: new mongoose.Types.ObjectId(userId),
//         isActive: true,
//         createdAt: { $gte: startDate }
//       }
//     },
//     {
//       $group: {
//         _id: {
//           year: { $year: '$createdAt' },
//           month: { $month: '$createdAt' },
//           day: { $dayOfMonth: '$createdAt' }
//         },
//         appsAdded: { $sum: 1 },
//         avgRiskScore: { $avg: '$riskScore' },
//         maxRiskScore: { $max: '$riskScore' },
//         apps: {
//           $push: {
//             name: '$appName',
//             riskScore: '$riskScore',
//             riskLevel: '$riskLevel'
//           }
//         }
//       }
//     },
//     {
//       $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
//     },
//     {
//       $project: {
//         date: {
//           $dateFromParts: {
//             year: '$_id.year',
//             month: '$_id.month',
//             day: '$_id.day'
//           }
//         },
//         appsAdded: 1,
//         avgRiskScore: { $round: ['$avgRiskScore', 1] },
//         maxRiskScore: 1,
//         apps: 1
//       }
//     }
//   ]);
// };

const User = mongoose.model('User', userSchema);

module.exports = User;
