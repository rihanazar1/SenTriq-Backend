const asyncHandler = require('express-async-handler');
const { faker } = require('@faker-js/faker');




const generateFakeData = asyncHandler(async (req, res) => {
  const { fields, count = 1 } = req.body;

  if (count < 1 || count > 100) {
    return res.status(400).json({
      success: false,
      error: 'Count must be between 1 and 100'
    });
  }

  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Please select at least one field to generate'
    });
  }

  const validFields = [
    'firstName', 
    'lastName', 
    'email', 
    'phoneNo', 
    'password', 
    'gender', 
    'location', 
    'address', 
    'domainName'
  ];

  const invalidFields = fields.filter(field => !validFields.includes(field));
  if (invalidFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Invalid fields: ${invalidFields.join(', ')}. Valid fields are: ${validFields.join(', ')}`
    });
  }

  const fakeDataArray = [];

  for (let i = 0; i < count; i++) {
    const fakeDataItem = {};

    fields.forEach(field => {
      switch (field) {
        case 'firstName':
          fakeDataItem.firstName = faker.person.firstName();
          break;
        
        case 'lastName':
          fakeDataItem.lastName = faker.person.lastName();
          break;
        
        case 'email':
          fakeDataItem.email = faker.internet.email();
          break;
        
        case 'phoneNo':
          fakeDataItem.phoneNo = faker.phone.number();
          break;
        
        case 'password':
          fakeDataItem.password = faker.internet.password({
            length: 12,
            memorable: false,
            pattern: /[A-Za-z0-9!@#$%^&*]/
          });
          break;
        
        case 'gender':
          fakeDataItem.gender = faker.person.sex();
          break;
        
        case 'location':
          fakeDataItem.location = {
            city: faker.location.city(),
            state: faker.location.state(),
            country: faker.location.country(),
            coordinates: {
              latitude: faker.location.latitude(),
              longitude: faker.location.longitude()
            }
          };
          break;
        
        case 'address':
          fakeDataItem.address = {
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state(),
            zipCode: faker.location.zipCode(),
            country: faker.location.country()
          };
          break;
        
        case 'domainName':
          fakeDataItem.domainName = faker.internet.domainName();
          break;
        
        default:
          break;
      }
    });

    fakeDataArray.push(fakeDataItem);
  }

  res.status(200).json({
    success: true,
    count: fakeDataArray.length,
    requestedFields: fields,
    data: fakeDataArray
  });
});





const getAvailableFields = asyncHandler(async (req, res) => {
  const availableFields = [
    {
      name: 'firstName',
      description: 'Random first name',
      example: 'John'
    },
    {
      name: 'lastName',
      description: 'Random last name',
      example: 'Doe'
    },
    {
      name: 'email',
      description: 'Random email address',
      example: 'john.doe@example.com'
    },
    {
      name: 'phoneNo',
      description: 'Random phone number',
      example: '+1-555-123-4567'
    },
    {
      name: 'password',
      description: 'Random secure password',
      example: 'Kj8#mN2$pQ9x'
    },
    {
      name: 'gender',
      description: 'Random gender',
      example: 'male'
    },
    {
      name: 'location',
      description: 'Random location with coordinates',
      example: {
        city: 'New York',
        state: 'New York',
        country: 'United States',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      }
    },
    {
      name: 'address',
      description: 'Random complete address',
      example: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'United States'
      }
    },
    {
      name: 'domainName',
      description: 'Random domain name',
      example: 'example.com'
    }
  ];

  res.status(200).json({
    success: true,
    totalFields: availableFields.length,
    fields: availableFields
  });
});





const getSampleData = asyncHandler(async (req, res) => {
  const sampleData = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phoneNo: faker.phone.number(),
    password: faker.internet.password({
      length: 12,
      memorable: false,
      pattern: /[A-Za-z0-9!@#$%^&*]/
    }),
    gender: faker.person.sex(),
    location: {
      city: faker.location.city(),
      state: faker.location.state(),
      country: faker.location.country(),
      coordinates: {
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude()
      }
    },
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: faker.location.country()
    },
    domainName: faker.internet.domainName()
  };

  res.status(200).json({
    success: true,
    message: 'Sample data showing all available fields',
    data: sampleData
  });
});

module.exports = {
  generateFakeData,
  getAvailableFields,
  getSampleData
};