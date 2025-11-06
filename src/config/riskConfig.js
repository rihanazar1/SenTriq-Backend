// Risk assessment configuration
const RISK_WEIGHTS = {
  paymentInfoAccess: 12,
  healthDataAccess: 12,
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

const RISK_SETTINGS = {
  // Synergy bonuses (additional risk when certain permissions are combined)
  synergies: {
    locationAndCamera: {
      permissions: ['locationAccess', 'cameraMicrophoneAccess'],
      bonus: 4
    },
    paymentAndStorage: {
      permissions: ['paymentInfoAccess', 'storageAccess'],
      bonus: 3
    },
    smsAndContacts: {
      permissions: ['smsAccess', 'contactsAccess'],
      bonus: 2
    }
  },

  // Domain breach scoring
  breachScoring: {
    pointsPerBreach: 5,
    maxBreachPoints: 15
  },

  // Risk level thresholds
  thresholds: {
    critical: 75,
    high: 50,
    medium: 20
  },

  // Cache settings
  cache: {
    domainTTL: 24 * 60 * 60 * 1000, // 24 hours
    riskTTL: 60 * 60 * 1000 // 1 hour
  },

  // Rate limiting
  rateLimits: {
    checkRisk: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    },
    domainCheck: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50 // limit domain checks
    }
  }
};

// Calculate maximum possible score
const MAX_WEIGHTS_SUM = Object.values(RISK_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
const MAX_SYNERGY_BONUS = Math.max(...Object.values(RISK_SETTINGS.synergies).map(s => s.bonus));
const MAX_POSSIBLE_SCORE = MAX_WEIGHTS_SUM + RISK_SETTINGS.breachScoring.maxBreachPoints + MAX_SYNERGY_BONUS;

module.exports = {
  RISK_WEIGHTS,
  RISK_SETTINGS,
  MAX_POSSIBLE_SCORE
};