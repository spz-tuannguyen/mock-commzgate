const express = require('express');
const router = express.Router();
const store = require('../store');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Mock Commzgate (Cloud & Device)'
  });
});

// Get captured messages
router.get('/api/messages', (req, res) => {
  const { mode, search } = req.query;
  const messages = store.getMessages({ mode, search });
  res.json({
    success: true,
    count: messages.length,
    messages
  });
});

// Clear messages
router.delete('/api/messages', (req, res) => {
  store.clearMessages();
  res.json({
    success: true,
    message: 'Message log cleared successfully'
  });
});

// Get simulation settings & stats
router.get('/api/settings', (req, res) => {
  res.json({
    success: true,
    settings: store.getSettings()
  });
});

// Update simulation settings
router.post('/api/settings', (req, res) => {
  const updated = store.updateSettings(req.body);
  res.json({
    success: true,
    message: 'Settings updated',
    settings: updated
  });
});

// Directly simulate a message from Dashboard UI
router.post('/api/simulate-send', (req, res) => {
  const { mode, recipient, message, type, otp, token, id, password } = req.body;

  const msgId = (mode === 'device' ? 'CG' : 'CGM') + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
  const generatedOtp = otp ? Math.floor(100000 + Math.random() * 900000).toString() : null;

  const record = store.addMessage({
    id: msgId,
    mode: mode || 'cloud',
    endpoint: mode === 'device' ? '/api/SendMsg' : '/gateway/SendMessage',
    method: 'SIMULATED',
    recipient: recipient || '6598765432',
    sender: mode === 'device' ? 'CG-ONE Modem' : 'CommzGate Cloud',
    content: message || 'Test simulated message from Web UI',
    type: type || 'A',
    otp: generatedOtp,
    authInfo: {
      token: token ? `${token.slice(0, 4)}***` : undefined,
      id: id || undefined
    },
    clientIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
    headers: req.headers,
    status: 'SUCCESS',
    statusCode: '000',
    statusMessage: 'OK (Manual Test)'
  });

  res.json({
    success: true,
    message: 'Simulated SMS added to feed',
    data: record
  });
});

// Server-Sent Events (SSE) for Real-time Dashboard Updates
router.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // For NGINX / Cloud proxies
  });

  // Send initial handshake and heartbeat
  res.write(`event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  store.addSSEClient(res);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

module.exports = router;
