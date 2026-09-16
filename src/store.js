const EventEmitter = require('events');

class MockStore extends EventEmitter {
  constructor() {
    super();
    this.messages = [];
    this.maxMessages = 300;
    this.sseClients = new Set();

    // Default configuration for simulation
    this.settings = {
      simulationMode: 'normal', // 'normal', 'error_01012', 'error_01010', 'error_500', 'error_429', 'custom'
      customStatusCode: '01099',
      customStatusText: 'Custom Simulation Error',
      latencyMs: 0, // Delay before replying in ms
      requireAuth: false, // If true, credentials must match below
      validCloudId: 'demo_user',
      validCloudPassword: 'demo_password',
      validDeviceToken: 'cg_token_secret',
      cloudStyle: 'official_01010', // 'official_01010' (e.g. 01010), 'prefix_01010', 'legacy_000', 'json'
      responseFormat: 'text' // 'text' | 'json' | 'xml'
    };

    this.stats = {
      totalReceived: 0,
      cloudCount: 0,
      deviceCount: 0,
      successCount: 0,
      failedCount: 0,
      lastReceivedAt: null
    };
  }

  addMessage(msg) {
    const messageRecord = {
      id: msg.id || 'CGM-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      mode: msg.mode || 'cloud', // 'cloud' | 'device'
      endpoint: msg.endpoint || '',
      method: msg.method || 'GET',
      recipient: msg.recipient || '',
      sender: msg.sender || 'CommzGate',
      content: msg.content || '',
      type: msg.type || 'A',
      otp: msg.otp || null,
      batch: msg.batch || null,
      authInfo: msg.authInfo || {},
      status: msg.status || 'SUCCESS',
      statusCode: msg.statusCode || '000',
      statusMessage: msg.statusMessage || 'OK',
      clientIp: msg.clientIp || '',
      headers: msg.headers || {},
      rawQuery: msg.rawQuery || {},
      rawBody: msg.rawBody || {},
      receivedAt: new Date().toISOString()
    };

    // Add to top of list
    this.messages.unshift(messageRecord);
    if (this.messages.length > this.maxMessages) {
      this.messages.pop();
    }

    // Update stats
    this.stats.totalReceived++;
    if (messageRecord.mode === 'cloud') {
      this.stats.cloudCount++;
    } else {
      this.stats.deviceCount++;
    }

    if (messageRecord.status === 'SUCCESS') {
      this.stats.successCount++;
    } else {
      this.stats.failedCount++;
    }
    this.stats.lastReceivedAt = messageRecord.receivedAt;

    // Broadcast to SSE clients
    this.broadcastSSE('new_message', messageRecord);

    return messageRecord;
  }

  getMessages(filter = {}) {
    let list = this.messages;
    if (filter.mode && filter.mode !== 'all') {
      list = list.filter(m => m.mode === filter.mode);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(m =>
        (m.recipient && m.recipient.toLowerCase().includes(q)) ||
        (m.content && m.content.toLowerCase().includes(q)) ||
        (m.id && m.id.toLowerCase().includes(q))
      );
    }
    return list;
  }

  clearMessages() {
    this.messages = [];
    this.stats.totalReceived = 0;
    this.stats.cloudCount = 0;
    this.stats.deviceCount = 0;
    this.stats.successCount = 0;
    this.stats.failedCount = 0;
    this.stats.lastReceivedAt = null;

    this.broadcastSSE('clear_messages', { timestamp: new Date().toISOString() });
    return true;
  }

  getSettings() {
    return { ...this.settings, stats: { ...this.stats } };
  }

  updateSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    // Ensure latencyMs is an integer >= 0
    this.settings.latencyMs = Math.max(0, parseInt(this.settings.latencyMs, 10) || 0);

    this.broadcastSSE('settings_updated', this.settings);
    return this.settings;
  }

  // SSE client registration
  addSSEClient(res) {
    this.sseClients.add(res);
    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  broadcastSSE(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch (err) {
        this.sseClients.delete(client);
      }
    }
  }
}

const store = new MockStore();
module.exports = store;
