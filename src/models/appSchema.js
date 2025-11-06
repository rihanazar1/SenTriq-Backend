const mongoose = require('mongoose');

const AppSchema = new mongoose.Schema(
  {
    appName: {
      type: String,
      required: [true, 'App name is required'],
      trim: true,
      index: true
    },

    url: {
      type: String,
      trim: true,
      default: null,
    },

    domain: {
      type: String,
      trim: true,
      lowercase: true,
      index: true
    },

    permissions: {
      contactsAccess: { type: Boolean, default: false },
      locationAccess: { type: Boolean, default: false },
      cameraMicrophoneAccess: { type: Boolean, default: false },
      storageAccess: { type: Boolean, default: false },
      cookiesOrTrackers: { type: Boolean, default: false },
      smsAccess: { type: Boolean, default: false },
      callLogsAccess: { type: Boolean, default: false },
      deviceIdAccess: { type: Boolean, default: false },
      paymentInfoAccess: { type: Boolean, default: false },
      healthDataAccess: { type: Boolean, default: false },
      networkInfoAccess: { type: Boolean, default: false },
    },

    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      validate: {
        validator: function(v) {
          return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid email address'
      }
    },

    userPhoneNumber: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: function(v) {
          return !v || /^[\+]?[1-9][\d]{0,15}$/.test(v);
        },
        message: 'Please enter a valid phone number'
      }
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },

    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      index: true
    },

    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      index: true
    },

    domainBreaches: {
      count: { type: Number, default: 0 },
      lastChecked: { type: Date, default: Date.now }
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    lastRiskCheck: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
AppSchema.index({ userId: 1, appName: 1 }, { unique: true });
AppSchema.index({ userId: 1, riskLevel: 1 });
AppSchema.index({ userId: 1, createdAt: -1 });
AppSchema.index({ domain: 1, 'domainBreaches.lastChecked': 1 });

// No pre-save hooks needed - simplified schema

// Static method for aggregation pipelines
AppSchema.statics.getUserAppStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: '$riskLevel',
        count: { $sum: 1 },
        avgScore: { $avg: '$riskScore' },
        apps: { $push: { appName: '$appName', riskScore: '$riskScore' } }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

AppSchema.statics.getHighRiskApps = function(userId, limit = 10) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
    { $sort: { riskScore: -1 } },
    { $limit: limit },
    {
      $project: {
        appName: 1,
        riskScore: 1,
        riskLevel: 1,
        url: 1,
        permissions: 1,
        createdAt: 1
      }
    }
  ]);
};

AppSchema.statics.getDomainRiskAnalysis = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true, domain: { $exists: true } } },
    {
      $group: {
        _id: '$domain',
        appCount: { $sum: 1 },
        avgRiskScore: { $avg: '$riskScore' },
        maxRiskScore: { $max: '$riskScore' },
        totalBreaches: { $sum: '$domainBreaches.count' },
        apps: { $push: '$appName' }
      }
    },
    { $sort: { avgRiskScore: -1 } }
  ]);
};

const AppModel = mongoose.model('App', AppSchema);

module.exports = AppModel;
