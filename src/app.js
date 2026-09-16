const express = require('express');
const cors = require('cors');
const path = require('path');

const cloudRoutes = require('./routes/cloud');
const deviceRoutes = require('./routes/device');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Mount API and Mock Routes
app.use(dashboardRoutes);
app.use(cloudRoutes);
app.use(deviceRoutes);

// Fallback for root / or SPA pages
app.get('*', (req, res, next) => {
  // If it's requesting an API or gateway endpoint that wasn't matched
  if (req.path.startsWith('/gateway') || req.path.startsWith('/api')) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Unknown Commzgate mock endpoint: ${req.path}`,
      supportedEndpoints: {
        cloud: ['/gateway/SendMessage', '/gateway/SendMessage.aspx', '/gateway/SendSMS', '/SendMessage'],
        device: ['/api/SendMsg', '/gateway/SendMsg', '/SendMsg', '/send_sms', '/api/GetMsgStat', '/api/RcvMsg'],
        dashboard: ['/api/messages', '/api/settings', '/api/events', '/health']
      }
    });
  }
  // Otherwise serve the Dashboard Web UI
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Mock-Commzgate Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

module.exports = app;
