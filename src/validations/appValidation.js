const yup = require('yup');

// App risk assessment validation schema
const appRiskSchema = yup.object({
  appName: yup
    .string()
    .required('App name is required')
    .trim()
    .min(1, 'App name cannot be empty')
    .max(100, 'App name cannot exceed 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.]+$/, 'App name contains invalid characters'),

  url: yup
    .string()
    .trim()
    .url('Please provide a valid URL')
    .optional()
    .nullable(),

  permissions: yup.object({
    contactsAccess: yup.boolean().default(false),
    locationAccess: yup.boolean().default(false),
    cameraMicrophoneAccess: yup.boolean().default(false),
    storageAccess: yup.boolean().default(false),
    cookiesOrTrackers: yup.boolean().default(false),
    smsAccess: yup.boolean().default(false),
    callLogsAccess: yup.boolean().default(false),
    deviceIdAccess: yup.boolean().default(false),
    paymentInfoAccess: yup.boolean().default(false),
    healthDataAccess: yup.boolean().default(false),
    networkInfoAccess: yup.boolean().default(false),
  }).default({}),

  userEmail: yup
    .string()
    .trim()
    .lowercase()
    .email('Please enter a valid email address')
    .optional()
    .nullable(),

  userPhoneNumber: yup
    .string()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .optional()
    .nullable(),

  save: yup
    .boolean()
    .default(true)
    .optional()
});

// App update validation schema
const appUpdateSchema = yup.object({
  appName: yup
    .string()
    .trim()
    .min(1, 'App name cannot be empty')
    .max(100, 'App name cannot exceed 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.]+$/, 'App name contains invalid characters')
    .optional(),

  url: yup
    .string()
    .trim()
    .url('Please provide a valid URL')
    .optional()
    .nullable(),

  permissions: yup.object({
    contactsAccess: yup.boolean().optional(),
    locationAccess: yup.boolean().optional(),
    cameraMicrophoneAccess: yup.boolean().optional(),
    storageAccess: yup.boolean().optional(),
    cookiesOrTrackers: yup.boolean().optional(),
    smsAccess: yup.boolean().optional(),
    callLogsAccess: yup.boolean().optional(),
    deviceIdAccess: yup.boolean().optional(),
    paymentInfoAccess: yup.boolean().optional(),
    healthDataAccess: yup.boolean().optional(),
    networkInfoAccess: yup.boolean().optional(),
  }).optional(),

  userEmail: yup
    .string()
    .trim()
    .lowercase()
    .email('Please enter a valid email address')
    .optional()
    .nullable(),

  userPhoneNumber: yup
    .string()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .optional()
    .nullable(),

  isActive: yup
    .boolean()
    .optional()
});

// App query validation schema
const appQuerySchema = yup.object({
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
    .default(10)
    .optional(),

  riskLevel: yup
    .string()
    .oneOf(['Low', 'Medium', 'High', 'Critical'], 'Invalid risk level')
    .optional(),

  sortBy: yup
    .string()
    .oneOf(['createdAt', 'riskScore', 'appName', 'lastRiskCheck'], 'Invalid sort field')
    .default('createdAt')
    .optional(),

  sortOrder: yup
    .string()
    .oneOf(['asc', 'desc'], 'Sort order must be asc or desc')
    .default('desc')
    .optional(),

  search: yup
    .string()
    .trim()
    .max(100, 'Search term cannot exceed 100 characters')
    .optional()
});

module.exports = {
  appRiskSchema,
  appUpdateSchema,
  appQuerySchema
};