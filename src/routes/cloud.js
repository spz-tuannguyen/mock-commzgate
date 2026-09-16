const express = require('express');
const router = express.Router();
const store = require('../store');
const { getParam, sendFormattedResponse, delay } = require('../utils');

/**
 * Common handler for Commzgate Cloud SMS
 */
async function handleCloudSendMessage(req, res) {
  const settings = store.getSettings();

  // Apply simulated latency if configured
  if (settings.latencyMs > 0) {
    await delay(settings.latencyMs);
  }

  // Extract parameters (case-insensitive)
  const id = getParam(req, 'ID', 'UserId', 'Username', 'api_id', 'id');
  const password = getParam(req, 'Password', 'Pass', 'api_password', 'password');
  const mobile = getParam(req, 'Mobile', 'MobileNo', 'Recipient', 'Phone', 'To', 'mobile');
  const type = getParam(req, 'Type', 'MsgType', 'type') || 'A';
  const message = getParam(req, 'Message', 'Msg', 'Text', 'Content', 'message');
  const sender = getParam(req, 'Sender', 'SenderId', 'From', 'sender') || 'CommzGate';
  const otpRequested = (getParam(req, 'OTP', 'otp') + '').toLowerCase() === 'true' || getParam(req, 'OTP', 'otp') === '1';
  const batch = getParam(req, 'Batch', 'batch');

  // Generate Message ID and OTP if requested
  const msgId = 'CGM' + Date.now().toString().slice(-8) + Math.floor(1000 + Math.random() * 9000);
  const generatedOtp = otpRequested ? Math.floor(100000 + Math.random() * 900000).toString() : null;

  // Prepare base audit log record
  const logRecord = {
    id: msgId,
    mode: 'cloud',
    endpoint: req.originalUrl || req.url,
    method: req.method,
    recipient: mobile || '',
    sender: sender,
    content: message || '',
    type: type,
    otp: generatedOtp,
    batch: batch,
    authInfo: { id: id ? String(id) : undefined, password: password ? '******' : undefined },
    clientIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
    headers: req.headers,
    rawQuery: req.query,
    rawBody: req.body,
    status: 'SUCCESS',
    statusCode: '000',
    statusMessage: 'SUCCESS'
  };

  // 1. Check Simulated Fault Injection
  if (settings.simulationMode === 'error_01012') {
    logRecord.status = 'FAILED';
    logRecord.statusCode = '01012';
    logRecord.statusMessage = 'AUTHENTICATION_ERROR';
    store.addMessage(logRecord);

    const raw = settings.cloudStyle === 'official_01010'
      ? '01012: Authentication error'
      : 'STATUS=01012:UNAUTHORIZED';

    return sendFormattedResponse(res, settings.responseFormat, {
      status: 'FAILED',
      httpStatus: 401,
      statusCode: '01012',
      messageId: msgId,
      description: 'Authentication error (Invalid UserID / Password / Signature)',
      rawText: raw
    });
  }

  if (settings.simulationMode === 'error_01010') {
    // Note: in fault injection we treat 01011 as invalid parameter error
    logRecord.status = 'FAILED';
    logRecord.statusCode = '01011';
    logRecord.statusMessage = 'INVALID_MOBILE';
    store.addMessage(logRecord);

    const raw = settings.cloudStyle === 'official_01010'
      ? '01011: Invalid parameter values. Eg. Mobile Number is in wrong format'
      : 'STATUS=01011:INVALID_MOBILE';

    return sendFormattedResponse(res, settings.responseFormat, {
      status: 'FAILED',
      httpStatus: 400,
      statusCode: '01011',
      messageId: msgId,
      description: 'Invalid parameter values. Eg. Mobile Number is in wrong format',
      rawText: raw
    });
  }

  if (settings.simulationMode === 'error_500') {
    logRecord.status = 'FAILED';
    logRecord.statusCode = '01013';
    logRecord.statusMessage = 'TRANSIENT_SYSTEM_ERROR';
    store.addMessage(logRecord);

    const raw = settings.cloudStyle === 'official_01010'
      ? '01013: Transient System error, please retry after 60 seconds'
      : 'STATUS=01013:INTERNAL_SERVER_ERROR';

    return sendFormattedResponse(res, settings.responseFormat, {
      status: 'FAILED',
      httpStatus: 500,
      statusCode: '01013',
      messageId: msgId,
      description: 'Transient System error, please retry after 60 seconds',
      rawText: raw
    });
  }

  if (settings.simulationMode === 'error_429') {
    logRecord.status = 'FAILED';
    logRecord.statusCode = '01020';
    logRecord.statusMessage = 'RATE_LIMIT_EXCEEDED';
    store.addMessage(logRecord);

    return sendFormattedResponse(res, settings.responseFormat, {
      status: 'FAILED',
      httpStatus: 429,
      statusCode: '01020',
      messageId: msgId,
      description: 'Request limit exceeded, please retry later',
      rawText: '01020: Request limit exceeded'
    });
  }

  if (settings.simulationMode === 'custom') {
    logRecord.status = 'FAILED';
    logRecord.statusCode = settings.customStatusCode || '01099';
    logRecord.statusMessage = settings.customStatusText || 'Custom Error';
    store.addMessage(logRecord);

    return sendFormattedResponse(res, settings.responseFormat, {
      status: 'FAILED',
      httpStatus: 400,
      statusCode: settings.customStatusCode,
      messageId: msgId,
      description: settings.customStatusText,
      rawText: `${settings.customStatusCode}: ${settings.customStatusText}`
    });
  }

  // 2. Check Authentication if enabled
  if (settings.requireAuth) {
    if (id !== settings.validCloudId || password !== settings.validCloudPassword) {
      logRecord.status = 'FAILED';
      logRecord.statusCode = '01012';
      logRecord.statusMessage = 'AUTHENTICATION_FAILED';
      store.addMessage(logRecord);

      return sendFormattedResponse(res, settings.responseFormat, {
        status: 'FAILED',
        httpStatus: 401,
        statusCode: '01012',
        messageId: msgId,
        description: 'Authentication Failed: ID or Password does not match',
        rawText: '01012: Authentication error'
      });
    }
  }

  // 3. Validate Required Fields
  if (!mobile) {
    logRecord.status = 'FAILED';
    logRecord.statusCode = '01011';
    logRecord.statusMessage = 'MISSING_MOBILE';
    store.addMessage(logRecord);

    return sendFormattedResponse(res, settings.responseFormat, {
      status: 'FAILED',
      httpStatus: 400,
      statusCode: '01011',
      messageId: msgId,
      description: 'Missing required parameter: Mobile',
      rawText: '01011: Invalid parameter values. Mobile is required'
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
      description: 'Missing required parameter: Message',
      rawText: '01011: Invalid parameter values. Message is required'
    });
  }

  // 4. Success Response
  logRecord.statusCode = '01010';
  store.addMessage(logRecord);

  let rawText = '';
  const style = settings.cloudStyle || 'official_01010';

  if (style === 'official_01010') {
    // Official CommzGate standard code
    if (generatedOtp) {
      rawText = `01010,OTP=${generatedOtp}`;
    } else {
      rawText = `01010: Accepted for Submission to Mobile Operator by CloudSMS`;
    }
  } else if (style === 'prefix_01010') {
    rawText = `STATUS=01010:SUCCESS:ID=${msgId}`;
    if (generatedOtp) rawText += `,OTP=${generatedOtp}`;
  } else if (style === 'legacy_000') {
    rawText = `STATUS=000:SUCCESS:ID=${msgId}`;
    if (generatedOtp) rawText += `,OTP=${generatedOtp}`;
  } else {
    rawText = `01010`;
  }

  // Custom response format override from query (?format=json, ?format=xml, ?format=simple)
  const formatOverride = getParam(req, 'format');
  const activeFormat = formatOverride || settings.responseFormat;

  if (formatOverride === 'simple') {
    return res.status(200).send('01010');
  }

  return sendFormattedResponse(res, activeFormat, {
    status: 'SUCCESS',
    httpStatus: 200,
    statusCode: '01010',
    messageId: msgId,
    otp: generatedOtp,
    description: 'Accepted for Submission to Mobile Operator by CloudSMS',
    rawText: rawText
  });
}

// Register all common Commzgate Cloud paths
router.all('/gateway/SendMessage', handleCloudSendMessage);
router.all('/gateway/SendMessage.aspx', handleCloudSendMessage);
router.all('/gateway/SendSMS', handleCloudSendMessage);
router.all('/SendMessage', handleCloudSendMessage);

module.exports = router;
