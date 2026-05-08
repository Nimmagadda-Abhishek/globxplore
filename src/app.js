const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/error');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
});
app.use('/api', limiter);

// API Routes
app.use('/api/auth', require('./modules/auth/routes'));
app.use('/api/activity', require('./modules/activity/routes'));
app.use('/api/leads', require('./modules/lead/routes'));
app.use('/api/student', require('./modules/student/routes'));
app.use('/api/visa', require('./modules/visa/routes'));
app.use('/api/payment', require('./modules/payment/routes'));
app.use('/api/user', require('./modules/user/routes'));
app.use('/api/analytics', require('./modules/analytics/routes'));
app.use('/api/commission', require('./modules/commission/routes'));
app.use('/api/offer', require('./modules/offer/routes'));
app.use('/api/webinar', require('./modules/webinar/routes'));
app.use('/api/notifications', require('./modules/notification/notification.routes'));
app.use('/api/webhooks', require('./modules/webhooks/webhook.routes'));
app.use('/api/admin', require('./modules/admin/admin.routes'));
app.use('/api/counsellor', require('./modules/counsellor/counsellor.routes'));
app.use('/api/am', require('./modules/am/routes'));
app.use('/api/agent', require('./modules/agent/agent.routes'));
app.use('/api/visa-agent', require('./modules/visa/visa_agent.routes'));
app.use('/api/client', require('./modules/visa/visa_client.routes'));
app.use('/api/alumni-manager', require('./modules/alumni/alumni_manager.routes'));
app.use('/api/alumni', require('./modules/alumni/alumni.routes'));
app.use('/api/subscriptions', require('./modules/subscription/routes'));
app.use('/api/appointments', require('./modules/appointment/routes'));
app.use('/api/documents', require('./modules/document/routes'));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Centralized Error Handling
app.use(errorHandler);

module.exports = app;
