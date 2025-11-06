const express = require('express');
const {
  checkAppRisk,
  getUserApps,
  getUserAppStats,
  updateApp,
  deleteApp,
  getApp
} = require('../controllers/app.Controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validation');
const validateQuery = require('../middleware/queryValidation');
const { createAppRiskLimiter } = require('../middleware/rateLimiter');
const { 
  appRiskSchema, 
  appUpdateSchema, 
  appQuerySchema 
} = require('../validations/appValidation');

const router = express.Router();

router.use(protect);

const appRiskLimiter = createAppRiskLimiter();


router.post('/check-risk', appRiskLimiter, validate(appRiskSchema), checkAppRisk);


router.get('/', validateQuery(appQuerySchema), getUserApps);


router.get('/stats', getUserAppStats);


router.get('/:id', getApp);


router.put('/:id', validate(appUpdateSchema), updateApp );


router.delete('/:id', deleteApp);

module.exports = router;