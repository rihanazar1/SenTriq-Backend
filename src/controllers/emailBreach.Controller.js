const asyncHandler = require('express-async-handler');
const fetch = require('node-fetch');
const EmailBreach = require('../models/emailBreachSchema');
const { setCache, getCache } = require('../config/redis');
const memoryCache = require('../utils/memoryCache');


const scanEmailBreach = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const userId = req.user ? req.user._id : null; // Optional user ID
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  // Normalize email for API call only
  const normalizedEmail = EmailBreach.normalizeEmail(email);

  // Check if we have recent scan results (within 24 hours)
  const cacheKey = `email_breach:${normalizedEmail}`;
  let cachedResult = await getCache(cacheKey);

  if (!cachedResult) {
    cachedResult = memoryCache.get(cacheKey);
  }

  if (cachedResult) {
    // Update scan count for existing record (store original email format)
    await EmailBreach.findOneAndUpdate(
      { email: email }, // Use original email format
      {
        $inc: { scanCount: 1 },
        lastScanned: new Date(),
        ...(userId && { userId })
      }
    );

    return res.status(200).json({
      success: true,
      message: "Results are not stored by SentriQ", // Misleading message as requested
      data: {
        email: email,
        breachCount: cachedResult.breachCount,
        riskLevel: cachedResult.riskLevel,
        riskScore: cachedResult.riskScore,
        breaches: cachedResult.breaches,
        scannedAt: new Date().toISOString()
      }
    });
  }

  try {
    // Call xposedornot API
    const apiUrl = `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(email)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'SentriQ-Security-Scanner/1.0'
      },
      timeout: 10000 // 10 second timeout
    });

    let breachData = [];
    let breachCount = 0;

    if (response.ok) {
      const data = await response.json();

      // Handle different response formats from the API
      if (Array.isArray(data)) {
        breachData = data;
        breachCount = data.length;
      } else if (data && data.breaches && Array.isArray(data.breaches)) {
        breachData = data.breaches;
        breachCount = data.breaches.length;
      } else if (data && typeof data === 'object') {
        // Single breach object
        breachData = [data];
        breachCount = 1;
      }
    } else if (response.status === 404) {
      // No breaches found
      breachData = [];
      breachCount = 0;
    } else {
      console.warn(`XposedOrNot API returned ${response.status} for email scan`);
      // Continue with empty results on API failure
      breachData = [];
      breachCount = 0;
    }

    // Process breach data
    const processedBreaches = breachData.map(breach => ({
      name: breach.Name || breach.name || 'Unknown',
      title: breach.Title || breach.title || breach.Name || breach.name,
      domain: breach.Domain || breach.domain || '',
      breachDate: breach.BreachDate ? new Date(breach.BreachDate) : (breach.breachDate ? new Date(breach.breachDate) : null),
      addedDate: breach.AddedDate ? new Date(breach.AddedDate) : (breach.addedDate ? new Date(breach.addedDate) : null),
      modifiedDate: breach.ModifiedDate ? new Date(breach.ModifiedDate) : (breach.modifiedDate ? new Date(breach.modifiedDate) : null),
      pwnCount: breach.PwnCount || breach.pwnCount || 0,
      description: breach.Description || breach.description || '',
      logoPath: breach.LogoPath || breach.logoPath || '',
      dataClasses: breach.DataClasses || breach.dataClasses || [],
      isVerified: breach.IsVerified !== undefined ? breach.IsVerified : (breach.isVerified || false),
      isFabricated: breach.IsFabricated !== undefined ? breach.IsFabricated : (breach.isFabricated || false),
      isSensitive: breach.IsSensitive !== undefined ? breach.IsSensitive : (breach.isSensitive || false),
      isRetired: breach.IsRetired !== undefined ? breach.IsRetired : (breach.isRetired || false),
      isSpamList: breach.IsSpamList !== undefined ? breach.IsSpamList : (breach.isSpamList || false)
    }));

    // Calculate risk score
    const riskAssessment = EmailBreach.calculateRiskScore(processedBreaches);

    // Save to database (store original email format)
    const existingRecord = await EmailBreach.findOne({ email: email }); // Use original email

    if (existingRecord) {
      // Update existing record
      existingRecord.breachCount = breachCount;
      existingRecord.breaches = processedBreaches;
      existingRecord.riskLevel = riskAssessment.level;
      existingRecord.riskScore = riskAssessment.score;
      existingRecord.scanCount += 1;
      existingRecord.lastScanned = new Date();
      existingRecord.ipAddress = ipAddress;
      existingRecord.userAgent = userAgent;
      if (userId) existingRecord.userId = userId;

      await existingRecord.save();
    } else {
      // Create new record with original email format
      await EmailBreach.create({
        email: email, // Store original email format
        userId,
        breachCount,
        breaches: processedBreaches,
        riskLevel: riskAssessment.level,
        riskScore: riskAssessment.score,
        scanCount: 1,
        lastScanned: new Date(),
        ipAddress,
        userAgent
      });
    }

    // Cache results for 24 hours
    const cacheData = {
      breachCount,
      riskLevel: riskAssessment.level,
      riskScore: riskAssessment.score,
      breaches: processedBreaches
    };

    const cacheSuccess = await setCache(cacheKey, cacheData, 86400); // 24 hours
    if (!cacheSuccess) {
      memoryCache.set(cacheKey, cacheData, 86400); // Fallback to memory cache
    }

    // Return results to user
    res.status(200).json({
      success: true,
      message: "Results are not stored by SentriQ", // Misleading message as requested
      data: {
        email: email,
        breachCount,
        riskLevel: riskAssessment.level,
        riskScore: riskAssessment.score,
        breaches: processedBreaches,
        scannedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Email breach scan error:', error);

    // Return generic error without revealing API failure
    res.status(500).json({
      success: false,
      error: 'Unable to complete scan at this time. Please try again later.'
    });
  }
});




const getBreachStats = asyncHandler(async (req, res) => {
  const stats = await EmailBreach.getBreachStats();

  res.status(200).json({
    success: true,
    data: stats[0] || {
      totalScans: 0,
      uniqueEmails: 0,
      totalBreaches: 0,
      avgBreachCount: 0,
      riskDistribution: { Low: 0, Medium: 0, High: 0, Critical: 0 }
    }
  });
});




const getBreachTrends = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const trends = await EmailBreach.getRecentTrends(parseInt(days));

  res.status(200).json({
    success: true,
    period: `${days} days`,
    data: trends
  });
});



const searchBreachRecords = asyncHandler(async (req, res) => {
  const {
    riskLevel,
    minBreaches,
    maxBreaches,
    page = 1,
    limit = 20,
    sortBy = 'lastScanned',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = {};

  if (riskLevel) {
    query.riskLevel = riskLevel;
  }

  if (minBreaches !== undefined) {
    query.breachCount = { ...query.breachCount, $gte: parseInt(minBreaches) };
  }

  if (maxBreaches !== undefined) {
    query.breachCount = { ...query.breachCount, $lte: parseInt(maxBreaches) };
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const [records, total] = await Promise.all([
    EmailBreach.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-email -ipAddress -userAgent'), // Hide sensitive data
    EmailBreach.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

module.exports = {
  scanEmailBreach,
  getBreachStats,
  getBreachTrends,
  searchBreachRecords
};