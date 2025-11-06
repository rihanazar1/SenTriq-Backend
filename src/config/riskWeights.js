// Configurable risk assessment weights
// These can be modified without code changes or loaded from database/admin UI

const DEFAULT_WEIGHTS = {
  paymentInfoAccess: 12,
  healthDataAccess: 12,
  userEmail: 10,        // Risk when email is provided
  userPhoneNumber: 10,  // Risk when phone number is provided
  smsAccess: 9,
  callLogsAccess: 8,
  locationAccess: 8,
  cameraMicrophoneAccess: 8,
  storageAccess: 7,
  cookiesOrTrackers: 6,
  deviceIdAccess: 5,
  contactsAccess: 5,
  networkInfoAccess: 4,
};

const SYNERGY_RULES = {
  // Location + Camera/Mic = Higher risk (stalking potential)
  locationAndCamera: {
    conditions: ['locationAccess', 'cameraMicrophoneAccess'],
    penalty: 4,
    description: 'Location + Camera access increases stalking risk'
  },

  // Payment + SMS = Higher risk (transaction interception)
  paymentAndSms: {
    conditions: ['paymentInfoAccess', 'smsAccess'],
    penalty: 3,
    description: 'Payment + SMS access increases transaction fraud risk'
  },

  // Email + Phone = Higher risk (identity theft)
  emailAndPhone: {
    conditions: ['userEmail', 'userPhoneNumber'],
    penalty: 3,
    description: 'Email + Phone data collection increases identity theft risk'
  },

  // Contacts + SMS = Higher risk (spam/phishing)
  contactsAndSms: {
    conditions: ['contactsAccess', 'smsAccess'],
    penalty: 2,
    description: 'Contacts + SMS access increases spam/phishing risk'
  },

  // Email + SMS = Higher risk (account takeover)
  emailAndSms: {
    conditions: ['userEmail', 'smsAccess'],
    penalty: 2,
    description: 'Email collection + SMS access increases account takeover risk'
  }
};

const BREACH_MULTIPLIER = {
  perBreach: 5,
  maxModifier: 15,
  description: 'Each domain breach adds 5 points, max 15'
};

const RISK_THRESHOLDS = {
  low: { min: 0, max: 20 },
  medium: { min: 21, max: 50 },
  high: { min: 51, max: 75 },
  critical: { min: 76, max: 100 }
};

// Calculate maximum possible score for normalization
const calculateMaxPossible = (weights = DEFAULT_WEIGHTS) => {
  const maxWeights = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const maxSynergy = Object.values(SYNERGY_RULES).reduce((sum, rule) => sum + rule.penalty, 0);
  return maxWeights + maxSynergy + BREACH_MULTIPLIER.maxModifier;
};

// Get risk level based on normalized score
const getRiskLevel = (normalizedScore) => {
  if (normalizedScore >= RISK_THRESHOLDS.critical.min) return 'Critical';
  if (normalizedScore >= RISK_THRESHOLDS.high.min) return 'High';
  if (normalizedScore >= RISK_THRESHOLDS.medium.min) return 'Medium';
  return 'Low';
};

// Generate suggestions based on permissions and risk factors
const generateSuggestions = (permissions, urlModifier, riskLevel) => {
  const suggestions = [];

  // Permission-based suggestions
  if (permissions.paymentInfoAccess) {
    suggestions.push({
      type: 'critical',
      message: 'Never store payment details unless from a trusted source. Prefer tokenization.',
      permission: 'paymentInfoAccess'
    });
  }

  if (permissions.healthDataAccess) {
    suggestions.push({
      type: 'critical',
      message: 'Health data is highly sensitive. Ensure HIPAA compliance and encryption.',
      permission: 'healthDataAccess'
    });
  }

  if (permissions.locationAccess) {
    suggestions.push({
      type: 'high',
      message: 'Disable location access unless absolutely necessary for app functionality.',
      permission: 'locationAccess'
    });
  }

  if (permissions.cameraMicrophoneAccess) {
    suggestions.push({
      type: 'high',
      message: 'Restrict camera/microphone permissions to prevent unauthorized surveillance.',
      permission: 'cameraMicrophoneAccess'
    });
  }

  if (permissions.smsAccess) {
    suggestions.push({
      type: 'high',
      message: 'Avoid SMS access. Use app-specific authentication tokens instead.',
      permission: 'smsAccess'
    });
  }

  if (permissions.userEmail) {
    suggestions.push({
      type: 'high',
      message: 'App is collecting your email address. This can lead to spam and phishing attacks.',
      permission: 'userEmail'
    });
  }

  if (permissions.userPhoneNumber) {
    suggestions.push({
      type: 'high',
      message: 'App is collecting your phone number. This can lead to unwanted calls and SMS spam.',
      permission: 'userPhoneNumber'
    });
  }

  if (permissions.contactsAccess) {
    suggestions.push({
      type: 'medium',
      message: 'Contacts access can lead to spam. Only allow for legitimate social features.',
      permission: 'contactsAccess'
    });
  }

  if (permissions.storageAccess) {
    suggestions.push({
      type: 'medium',
      message: 'Storage access can expose personal files. Monitor what data is accessed.',
      permission: 'storageAccess'
    });
  }

  // Breach-based suggestions
  if (urlModifier > 0) {
    suggestions.push({
      type: 'critical',
      message: 'App domain has known security breaches. Change passwords and enable 2FA.',
      permission: 'domain'
    });
  }

  // Synergy-based suggestions
  if (permissions.locationAccess && permissions.cameraMicrophoneAccess) {
    suggestions.push({
      type: 'critical',
      message: 'Location + Camera combination poses stalking risks. Consider disabling both.',
      permission: 'synergy'
    });
  }

  if (permissions.userEmail && permissions.userPhoneNumber) {
    suggestions.push({
      type: 'critical',
      message: 'App is collecting both email and phone number. This increases identity theft risk significantly.',
      permission: 'synergy'
    });
  }

  if (permissions.userEmail && permissions.smsAccess) {
    suggestions.push({
      type: 'high',
      message: 'Email collection + SMS access can enable account takeover attacks. Be very cautious.',
      permission: 'synergy'
    });
  }

  // Risk level based suggestions
  if (riskLevel === 'Critical') {
    suggestions.push({
      type: 'critical',
      message: 'This app poses critical privacy risks. Consider uninstalling or severely restricting permissions.',
      permission: 'overall'
    });
  } else if (riskLevel === 'High') {
    suggestions.push({
      type: 'high',
      message: 'This app has high privacy risks. Review and disable unnecessary permissions.',
      permission: 'overall'
    });
  }

  return suggestions;
};

module.exports = {
  DEFAULT_WEIGHTS,
  SYNERGY_RULES,
  BREACH_MULTIPLIER,
  RISK_THRESHOLDS,
  calculateMaxPossible,
  getRiskLevel,
  generateSuggestions
};