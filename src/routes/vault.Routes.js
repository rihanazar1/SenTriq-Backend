const express = require('express');
const {
  createVaultEntry,
  getVaultEntries,
  getDecryptedEntry,
  updateVaultEntry,
  deleteVaultEntry,
  getVaultStats
} = require('../controllers/vault.Controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validation');
const validateQuery = require('../middleware/queryValidation');
const { createAppRiskLimiter } = require('../middleware/rateLimiter');
const {
  createVaultSchema,
  updateVaultSchema,
  decryptEntrySchema,
  deleteEntrySchema,
  vaultQuerySchema
} = require('../validations/vaultValidation');

const router = express.Router();

// Apply authentication to all vault routes
router.use(protect);

// Apply rate limiting to sensitive operations
const vaultLimiter = createAppRiskLimiter();


router.post('/', 
  vaultLimiter,
  validate(createVaultSchema), 
  createVaultEntry
);


router.get('/', 
  validateQuery(vaultQuerySchema),
  getVaultEntries
);


router.get('/stats', getVaultStats);

router.post('/:id/decrypt', 
  vaultLimiter,
  validate(decryptEntrySchema), 
  getDecryptedEntry
);

router.put('/:id', 
  vaultLimiter,
  validate(updateVaultSchema), 
  updateVaultEntry
);


router.delete('/:id', 
  vaultLimiter,
  validate(deleteEntrySchema), 
  deleteVaultEntry
);

module.exports = router;