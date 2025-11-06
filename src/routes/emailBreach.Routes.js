const express = require('express');
const {
  scanEmailBreach,
  getBreachStats,
  getBreachTrends,
  searchBreachRecords
} = require('../controllers/emailBreach.Controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validation');
const validateQuery = require('../middleware/queryValidation');
const { createGeneralLimiter } = require('../middleware/rateLimiter');
const {
  emailBreachScanSchema,
  breachSearchSchema,
  trendsSchema
} = require('../validations/emailBreachValidation');

const router = express.Router();

// Create specific rate limiter for email scanning
const emailScanLimiter = createGeneralLimiter();



router.use(protect); // All routes below require authentication

router.post('/scan', emailScanLimiter, validate(emailBreachScanSchema), scanEmailBreach);


router.get('/stats', getBreachStats);



router.get('/trends', 
  validateQuery(trendsSchema),
  getBreachTrends
);



router.get('/search', 
  validateQuery(breachSearchSchema),
  searchBreachRecords
);

module.exports = router;