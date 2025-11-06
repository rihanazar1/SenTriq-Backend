const mongoose = require('mongoose');

const EmailBreachSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },

    breachCount: {
      type: Number,
      default: 0,
      index: true
    },

    breaches: [{
      name: String,
      title: String,
      domain: String,
      breachDate: Date,
      addedDate: Date,
      modifiedDate: Date,
      pwnCount: Number,
      description: String,
      logoPath: String,
      dataClasses: [String],
      isVerified: Boolean,
      isFabricated: Boolean,
      isSensitive: Boolean,
      isRetired: Boolean,
      isSpamList: Boolean
    }],

    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Low',
      index: true
    },

    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    scanCount: {
      type: Number,
      default: 1
    },

    lastScanned: {
      type: Date,
      default: Date.now
    },

    ipAddress: {
      type: String,
      default: null
    },

    userAgent: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for performance and analytics
EmailBreachSchema.index({ email: 1, lastScanned: -1 });
EmailBreachSchema.index({ userId: 1, createdAt: -1 });
EmailBreachSchema.index({ riskLevel: 1, breachCount: -1 });
EmailBreachSchema.index({ createdAt: -1 });

// Static method to normalize email
EmailBreachSchema.statics.normalizeEmail = function(email) {
  return email.toLowerCase().trim();
};

// Static method to calculate risk score based on breaches
EmailBreachSchema.statics.calculateRiskScore = function(breaches) {
  if (!breaches || breaches.length === 0) return { score: 0, level: 'Low' };

  let score = 0;
  
  breaches.forEach(breach => {
    // Base score for each breach
    score += 10;
    
    // Additional score based on data sensitivity
    if (breach.dataClasses) {
      breach.dataClasses.forEach(dataClass => {
        const lowerClass = dataClass.toLowerCase();
        if (lowerClass.includes('password')) score += 15;
        if (lowerClass.includes('credit card') || lowerClass.includes('payment')) score += 20;
        if (lowerClass.includes('social security') || lowerClass.includes('ssn')) score += 25;
        if (lowerClass.includes('phone') || lowerClass.includes('address')) score += 5;
        if (lowerClass.includes('email')) score += 3;
      });
    }
    
    // Additional score for verified breaches
    if (breach.isVerified) score += 5;
    
    // Additional score for recent breaches (within last 2 years)
    if (breach.breachDate && new Date(breach.breachDate) > new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)) {
      score += 10;
    }
    
    // Additional score for large breaches
    if (breach.pwnCount > 1000000) score += 10; // 1M+ accounts
    if (breach.pwnCount > 10000000) score += 15; // 10M+ accounts
  });

  // Cap the score at 100
  score = Math.min(score, 100);

  // Determine risk level
  let level = 'Low';
  if (score >= 75) level = 'Critical';
  else if (score >= 50) level = 'High';
  else if (score >= 25) level = 'Medium';

  return { score, level };
};

// Static method to get breach statistics
EmailBreachSchema.statics.getBreachStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalScans: { $sum: '$scanCount' },
        uniqueEmails: { $sum: 1 },
        totalBreaches: { $sum: '$breachCount' },
        avgBreachCount: { $avg: '$breachCount' },
        riskDistribution: {
          $push: '$riskLevel'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalScans: 1,
        uniqueEmails: 1,
        totalBreaches: 1,
        avgBreachCount: { $round: ['$avgBreachCount', 2] },
        riskDistribution: {
          $reduce: {
            input: '$riskDistribution',
            initialValue: { Low: 0, Medium: 0, High: 0, Critical: 0 },
            in: {
              Low: { $cond: [{ $eq: ['$$this', 'Low'] }, { $add: ['$$value.Low', 1] }, '$$value.Low'] },
              Medium: { $cond: [{ $eq: ['$$this', 'Medium'] }, { $add: ['$$value.Medium', 1] }, '$$value.Medium'] },
              High: { $cond: [{ $eq: ['$$this', 'High'] }, { $add: ['$$value.High', 1] }, '$$value.High'] },
              Critical: { $cond: [{ $eq: ['$$this', 'Critical'] }, { $add: ['$$value.Critical', 1] }, '$$value.Critical'] }
            }
          }
        }
      }
    }
  ]);
};

// Static method to get recent breach trends
EmailBreachSchema.statics.getRecentTrends = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        scansPerDay: { $sum: '$scanCount' },
        uniqueEmailsPerDay: { $sum: 1 },
        avgBreachCount: { $avg: '$breachCount' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        scansPerDay: 1,
        uniqueEmailsPerDay: 1,
        avgBreachCount: { $round: ['$avgBreachCount', 2] }
      }
    }
  ]);
};

const EmailBreachModel = mongoose.model('EmailBreach', EmailBreachSchema);

module.exports = EmailBreachModel;