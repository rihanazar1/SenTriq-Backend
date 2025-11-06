const express = require("express");
const cors = require("cors");
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.Routes');
const appRoutes = require('./routes/app.Routes');
const vaultRoutes = require('./routes/vault.Routes');
const fakeDataRoutes = require('./routes/fakeData.Routes');
const emailBreachRoutes = require('./routes/emailBreach.Routes');
const { createGeneralLimiter, createAuthLimiter } = require('./middleware/rateLimiter');

const app = express();

// General rate limiting
const generalLimiter = createGeneralLimiter();
const authLimiter = createAuthLimiter();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(generalLimiter);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/apps', appRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/fake-data', fakeDataRoutes);
app.use('/api/email-breach', emailBreachRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SentriQ Backend API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
        changePassword: 'PUT /api/auth/change-password',
        deleteAccount: 'DELETE /api/auth/profile',
        dashboard: 'GET /api/auth/dashboard',
        me: 'GET /api/auth/me'
      },
      apps: {
        checkRisk: 'POST /api/apps/check-risk',
        getApps: 'GET /api/apps',
        getStats: 'GET /api/apps/stats',
        getApp: 'GET /api/apps/:id',
        updateApp: 'PUT /api/apps/:id',
        deleteApp: 'DELETE /api/apps/:id'
      },
      vault: {
        create: 'POST /api/vault',
        getAll: 'GET /api/vault',
        getStats: 'GET /api/vault/stats',
        decrypt: 'POST /api/vault/:id/decrypt',
        update: 'PUT /api/vault/:id',
        delete: 'DELETE /api/vault/:id'
      },
      fakeData: {
        generate: 'POST /api/fake-data/generate',
        fields: 'GET /api/fake-data/fields',
        sample: 'GET /api/fake-data/sample'
      },
      emailBreach: {
        scan: 'POST /api/email-breach/scan',
        stats: 'GET /api/email-breach/stats',
        trends: 'GET /api/email-breach/trends',
        search: 'GET /api/email-breach/search'
      }
    }
  });
});

// 404 handler - catch all unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

module.exports = app;