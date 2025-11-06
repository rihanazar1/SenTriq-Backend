const yup = require('yup');

// Email breach scan validation schema
const emailBreachScanSchema = yup.object({
  email: yup
    .string()
    .required('Email address is required')
    .email('Please enter a valid email address')
    .trim()
    .lowercase()
    .max(255, 'Email address cannot exceed 255 characters')
});

// Breach search validation schema
const breachSearchSchema = yup.object({
  riskLevel: yup
    .string()
    .oneOf(['Low', 'Medium', 'High', 'Critical'], 'Invalid risk level')
    .optional(),

  minBreaches: yup
    .number()
    .integer('Minimum breaches must be an integer')
    .min(0, 'Minimum breaches cannot be negative')
    .optional(),

  maxBreaches: yup
    .number()
    .integer('Maximum breaches must be an integer')
    .min(0, 'Maximum breaches cannot be negative')
    .optional(),

  page: yup
    .number()
    .integer('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1)
    .optional(),

  limit: yup
    .number()
    .integer('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20)
    .optional(),

  sortBy: yup
    .string()
    .oneOf(['lastScanned', 'createdAt', 'breachCount', 'riskScore'], 'Invalid sort field')
    .default('lastScanned')
    .optional(),

  sortOrder: yup
    .string()
    .oneOf(['asc', 'desc'], 'Sort order must be asc or desc')
    .default('desc')
    .optional()
});

// Trends validation schema
const trendsSchema = yup.object({
  days: yup
    .number()
    .integer('Days must be an integer')
    .min(1, 'Days must be at least 1')
    .max(365, 'Days cannot exceed 365')
    .default(30)
    .optional()
});

module.exports = {
  emailBreachScanSchema,
  breachSearchSchema,
  trendsSchema
};