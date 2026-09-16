const express = require('express');
const router = express.Router();
const store = require('../store');
const { getParam, sendFormattedResponse, delay } = require('../utils');

/**
 * Common handler for Commzgate Device / CG-ONE SendMsg API
 */
async function handleDeviceSendMsg(req, res) {
  const settings = store.getSettings();

  // Apply simulated latency if configured
  if (settings.latencyMs > 0) {
    await delay(settings.latencyMs);
  }

  // Extract parameters (case-insensitive)
  const token = getParam(req, 'token', 'apiKey', 'Token', 'key');
  const id = getParam(req, 'ID', 'UserId', 'Username', 'id');
  const password = getParam(req, 'Password', 'Pass', 'password');
  const mobile = getParam(req, 'mobile', 'Mobile', 'mobile_no', 'recipient', 'to', 'phone');
  const message = getParam(req, 'message', 'Message', 'msg', 'text', 'content');
  const type = getParam(req, 'type', 'Type') || 'A';
  const otpRequested = (getParam(req, 'otp', 'OTP') + '').toLowerCase() === 'true' || getParam(req, 'otp', 'OTP') === '1';

  // Generate Message ID (CG-ONE prefix) and OTP if requested
  const msgId = 'CG' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
  const generatedOtp = otpRequested ? Math.floor(10000 + Math.random() * 90000).toString() : null;

  // Audit log record
  const logRecord = {
    id: msgId,
    mode: 'device',
    endpoint: req.originalUrl || req.url,
    method: req.method,
    recipient: mobile || '',
    sender: 'CG-ONE Modem',
    content: message || '',
    type: type,
    otp: generatedOtp,
    authInfo: {
      token: token ? `${token.slice(0, 4)}***` : undefined,
      id: id ? String(id) : undefined
    },
    clientIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
    headers: req.headers,
    rawQuery: req.query,
    rawBody: req.body,
    status: 'SUCCESS',
    statusCode: '000',
    statusMessage: 'SUCCESS'
  };

  // 1. Fault Injection Checks
  if (settings.simulationMode === 'error_01012') {
    logRecord.status = 'FAILED';
    logRecord.statusCode = '01012';
    logRecord.statusMessage = 'UNAUTHORIZED';
    store.addMessage(logRecord);

    return sendFormattedResponse(res, settings.responseFormat, {
      status: 'FAILED',
      httpStatus: 401,
      statusCode: '01012',
      messageId: msgId,
      description: 'Device Authentication Failed: Invalid Token',
      rawText: 'ERROR: UNAUTHORIZED'
    });
  }

  if (settings.simulationMode === 'error_01010') {
    logRecord.status = 'FAILED';
    logRecord.statusCode = '01010';
    logRecord.statusMessage = 'INVALID_MOBILE';
    store.addMessage(logRecord);

    return sendFormattedResponse(res, settings.responseFormat, {
      status: 'FAILED',
      httpStatus: 400,
      statusCode: '01010',
      messageId: msgId,
      description: 'Invalid Mobile Number',
      rawText: 'ERROR: INVALID_MOBILE'
    });
  }

  if (settings.simulationMode === 'error_500') {
    logRecord.status = 'FAILED';
    logRecord.statusCode = '09999';
    logRecord.statusMessage = 'MODEM_ERROR';
    store.addMessage(logRecord);

    return sendFormattedResponse(res, settings.responseFormat, {
      status: 'FAILED',
      httpStatus: 500,
      statusCode: '09999',
      messageId: msgId,
      description: 'Appliance Modem Hardware Failure',
      rawText: 'ERROR: MODEM_FAILURE'
    });
  }

  if (settings.simulationMode === 'error_429') {
    logRecord.status = 'FAILED';
    logRecord.statusCode = '01020';
    logRecord.statusMessage = 'MODEM_BUSY';
    store.addMessage(logRecord);

    return sendFormattedResponse(res, settings.responseFormat, {
      status: 'FAILED',
      httpStatus: 429,
      statusCode: '01020',
      messageId: msgId,
      description: 'Device modem queue full (max 5 SMS/sec)',
      rawText: 'ERROR: MODEM_QUEUE_FULL'
    });
  }

  if (settings.simulationMode === 'custom') {
    logRecord.status = 'FAILED';
    logRecord.statusCode = settings.customStatusCode || '01099';
    logRecord.statusMessage = settings.customStatusText || 'Custom Device Error';
    store.addMessage(logRecord);

    return sendFormattedResponse(res, settings.responseFormat, {
      status: 'FAILED',
      httpStatus: 400,
      statusCode: settings.customStatusCode,
      messageId: msgId,
      description: settings.customStatusText,
      rawText: `ERROR: ${settings.customStatusText}`
    });
  }

  // 2. Authentication check if enabled
  if (settings.requireAuth) {
    const isTokenMatch = token && token === settings.validDeviceToken;
    const isCredsMatch = id && password && id === settings.validCloudId && password === settings.validCloudPassword;

    if (!isTokenMatch && !isCredsMatch) {
      logRecord.status = 'FAILED';
      logRecord.statusCode = '01012';
      logRecord.statusMessage = 'AUTHENTICATION_FAILED';
      store.addMessage(logRecord);

      return sendFormattedResponse(res, settings.responseFormat, {
        status: 'FAILED',
        httpStatus: 401,
        statusCode: '01012',
        messageId: msgId,
        description: 'Device API Token or Credentials invalid',
        rawText: 'ERROR: INVALID_TOKEN'
      });
    }
  }

  // 3. Validation
  if (!mobile) {
    logRecord.status = 'FAILED';
    logRecord.statusCode = '01010';
    logRecord.statusMessage = 'MISSING_MOBILE';
    store.addMessage(logRecord);

    return sendFormattedResponse(res, settings.responseFormat, {
      status: 'FAILED',
      httpStatus: 400,
      statusCode: '01010',
      messageId: msgId,
      description: 'Missing mobile parameter',
      rawText: 'ERROR: MISSING_MOBILE'
    });
  }

  if (!message) {
    logRecord.status = 'FAILED';
    logRecord.statusCode = '01011';
    logRecord.statusMessage = 'MISSING_MESSAGE';
    store.addMessage(logRecord);

    return sendFormattedResponse(res, settings.responseFormat, {
      status: 'FAILED',
      httpStatus: 400,
      statusCode: '01011',
      messageId: msgId,
      description: 'Missing message parameter',
      rawText: 'ERROR: MISSING_MESSAGE'
    });
  }

  // 4. Success Response
  store.addMessage(logRecord);

  // Commzgate CG-ONE returns MessageID, or MessageID,OTP
  let rawText = msgId;
  if (generatedOtp) {
    rawText += `,${generatedOtp}`;
  }

  const formatOverride = getParam(req, 'format');
  const activeFormat = formatOverride || settings.responseFormat;

  return sendFormattedResponse(res, activeFormat, {
    status: 'SUCCESS',
    httpStatus: 200,
    statusCode: '000',
    messageId: msgId,
    otp: generatedOtp,
    description: 'CG-ONE: Message accepted by modem queue',
    rawText: rawText
  });
}

/**
 * Commzgate Device GetMsgStat API
 */
async function handleGetMsgStat(req, res) {
  const msgId = getParam(req, 'id', 'msgId', 'messageId', 'ID') || 'UNKNOWN';
  const format = getParam(req, 'format') || store.getSettings().responseFormat;

  return sendFormattedResponse(res, format, {
    status: 'SUCCESS',
    httpStatus: 200,
    statusCode: '000',
    messageId: msgId,
    description: 'Message status query',
    rawText: 'STATUS=DELIVERED'
  });
}

/**
 * Commzgate Device RcvMsg API (Incoming SMS)
 */
async function handleRcvMsg(req, res) {
  const format = getParam(req, 'format') || store.getSettings().responseFormat;
  return sendFormattedResponse(res, format, {
    status: 'SUCCESS',
    httpStatus: 200,
    statusCode: '000',
    description: 'No new incoming messages in modem inbox',
    rawText: 'RCV_MSG_COUNT=0'
  });
}

// Register all device endpoints
router.all('/api/SendMsg', handleDeviceSendMsg);
router.all('/gateway/SendMsg', handleDeviceSendMsg);
router.all('/SendMsg', handleDeviceSendMsg);
router.all('/send_sms', handleDeviceSendMsg);
router.all('/cgi-bin/SendMsg', handleDeviceSendMsg);

router.all('/api/GetMsgStat', handleGetMsgStat);
router.all('/gateway/GetMsgStat', handleGetMsgStat);
router.all('/GetMsgStat', handleGetMsgStat);

router.all('/api/RcvMsg', handleRcvMsg);
router.all('/gateway/RcvMsg', handleRcvMsg);
router.all('/RcvMsg', handleRcvMsg);

module.exports = router;
