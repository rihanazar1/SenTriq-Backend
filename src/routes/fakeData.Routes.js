const express = require('express');
const {
  generateFakeData,
  getAvailableFields,
  getSampleData
} = require('../controllers/fakeData.Controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validation');
const { createGeneralLimiter } = require('../middleware/rateLimiter');
const { generateFakeDataSchema } = require('../validations/fakeDataValidation');

const router = express.Router();

// Apply authentication to all fake data routes
router.use(protect);

// Apply rate limiting
const fakeDataLimiter = createGeneralLimiter();


router.post('/generate', 
  fakeDataLimiter,
  validate(generateFakeDataSchema), 
  generateFakeData
);


router.get('/fields', getAvailableFields);

router.get('/sample', getSampleData);

module.exports = router;