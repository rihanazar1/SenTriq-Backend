const yup = require('yup');

// Generate fake data validation schema
const generateFakeDataSchema = yup.object({
  fields: yup
    .array()
    .of(
      yup.string().oneOf(
        ['firstName', 'lastName', 'email', 'phoneNo', 'password', 'gender', 'location', 'address', 'domainName'],
        'Invalid field name'
      )
    )
    .required('Fields array is required')
    .min(1, 'Please select at least one field')
    .max(9, 'Cannot select more than 9 fields'),

  count: yup
    .number()
    .integer('Count must be an integer')
    .min(1, 'Count must be at least 1')
    .max(100, 'Count cannot exceed 100')
    .default(1)
    .optional()
});

module.exports = {
  generateFakeDataSchema
};