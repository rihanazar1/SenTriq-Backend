const validateQuery = (schema) => {
  return async (req, res, next) => {
    try {
      const validatedData = await schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      
      req.query = validatedData;
      next();
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = error.inner.map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          error: 'Query validation failed',
          details: errors
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error during query validation'
      });
    }
  };
};

module.exports = validateQuery;