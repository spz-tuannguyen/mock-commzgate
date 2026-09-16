/**
 * Case-insensitive parameter extraction from query and body
 */
function getParam(req, ...names) {
  const query = req.query || {};
  const body = (typeof req.body === 'object' && req.body !== null) ? req.body : {};

  // Check query parameters
  for (const name of names) {
    if (query[name] !== undefined) return query[name];
    // Case-insensitive query search
    const lower = name.toLowerCase();
    for (const key of Object.keys(query)) {
      if (key.toLowerCase() === lower) return query[key];
    }
  }

  // Check body parameters
  for (const name of names) {
    if (body[name] !== undefined) return body[name];
    // Case-insensitive body search
    const lower = name.toLowerCase();
    for (const key of Object.keys(body)) {
      if (key.toLowerCase() === lower) return body[key];
    }
  }

  return undefined;
}

/**
 * Format response based on requested or configured format
 */
function sendFormattedResponse(res, format, data) {
  const isSuccess = data.status === 'SUCCESS';

  if (format === 'json' || res.req.headers['accept']?.includes('application/json')) {
    return res.status(data.httpStatus || (isSuccess ? 200 : 400)).json({
      status: data.statusCode || (isSuccess ? '000' : '01012'),
      message_id: data.messageId || null,
      otp: data.otp || null,
      description: data.description || (isSuccess ? 'Message queued successfully' : 'Failed'),
      timestamp: new Date().toISOString()
    });
  }

  if (format === 'xml' || res.req.headers['accept']?.includes('application/xml')) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.status(data.httpStatus || (isSuccess ? 200 : 400)).send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<Response>\n` +
      `  <Status>${data.statusCode || (isSuccess ? '000' : '01012')}</Status>\n` +
      `  <MessageId>${data.messageId || ''}</MessageId>\n` +
      (data.otp ? `  <OTP>${data.otp}</OTP>\n` : '') +
      `  <Description>${data.description || (isSuccess ? 'Success' : 'Error')}</Description>\n` +
      `</Response>`
    );
  }

  // Default: text/plain as expected by Commzgate
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(data.httpStatus || 200).send(data.rawText || (isSuccess ? '000' : '01012'));
}

/**
 * Async delay helper
 */
function delay(ms) {
  if (!ms || ms <= 0) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  getParam,
  sendFormattedResponse,
  delay
};
