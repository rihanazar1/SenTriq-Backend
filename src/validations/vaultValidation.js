const yup = require('yup');

// Create vault entry validation schema
const createVaultSchema = yup.object({
  applicationName: yup
    .string()
    .required('Application/Website name is required')
    .trim()
    .min(1, 'Application name cannot be empty')
    .max(100, 'Application name cannot exceed 100 characters'),

  websiteUrl: yup
    .string()
    .trim()
    .url('Please provide a valid URL')
    .optional()
    .nullable(),

  username: yup
    .string()
    .required('Username/Email is required')
    .trim()
    .min(1, 'Username cannot be empty')
    .max(255, 'Username cannot exceed 255 characters'),

  password: yup
    .string()
    .required('Password is required')
    .min(1, 'Password cannot be empty')
    .max(500, 'Password cannot exceed 500 characters'),

  notes: yup
    .string()
    .trim()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional()
    .nullable(),



  masterPassword: yup
    .string()
    .required('Master password is required to encrypt data')
});

// Update vault entry validation schema
const updateVaultSchema = yup.object({
  applicationName: yup
    .string()
    .trim()
    .min(1, 'Application name cannot be empty')
    .max(100, 'Application name cannot exceed 100 characters')
    .optional(),

  websiteUrl: yup
    .string()
    .trim()
    .url('Please provide a valid URL')
    .optional()
    .nullable(),

  username: yup
    .string()
    .trim()
    .min(1, 'Username cannot be empty')
    .max(255, 'Username cannot exceed 255 characters')
    .optional(),

  password: yup
    .string()
    .min(1, 'Password cannot be empty')
    .max(500, 'Password cannot exceed 500 characters')
    .optional(),

  notes: yup
    .string()
    .trim()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional()
    .nullable(),



  masterPassword: yup
    .string()
    .required('Master password is required to update encrypted data')
});

// Decrypt entry validation schema
const decryptEntrySchema = yup.object({
  masterPassword: yup
    .string()
    .required('Master password is required to decrypt data')
});

// Delete entry validation schema
const deleteEntrySchema = yup.object({
  masterPassword: yup
    .string()
    .required('Master password is required to delete entry')
});

// Query validation schema
const vaultQuerySchema = yup.object({
  search: yup
    .string()
    .trim()
    .max(100, 'Search term cannot exceed 100 characters')
    .optional()
});

module.exports = {
  createVaultSchema,
  updateVaultSchema,
  decryptEntrySchema,
  deleteEntrySchema,
  vaultQuerySchema
};