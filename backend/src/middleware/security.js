import jwt from 'jsonwebtoken';

// In-memory rate limiting map for login attempts per IP
// (resilient fallback if DB connection fails, and protects before DB lookups)
const ipRateLimits = new Map();

// JWT helper for stateless CAPTCHA signature
const CAPTCHA_SECRET = process.env.JWT_SECRET || 'disciplinex_captcha_secret_123_456';

/**
 * 1. Recursive Input Sanitization Middleware
 * Protects against XSS and MongoDB Query Injection
 */
export const sanitizeRequest = (req, res, next) => {
  const sanitizeValue = (val) => {
    if (typeof val === 'string') {
      // Prevent MongoDB operator injection (strip starting $)
      let cleaned = val;
      if (cleaned.startsWith('$')) {
        cleaned = cleaned.replace(/^\$/, '');
      }
      // Strip dangerous HTML/Script tags to prevent XSS
      cleaned = cleaned
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
      return cleaned;
    }
    
    if (val && typeof val === 'object') {
      if (Array.isArray(val)) {
        return val.map(sanitizeValue);
      }
      const sanitizedObj = {};
      for (const key of Object.keys(val)) {
        // Prevent key-based injection by omitting keys starting with $
        if (!key.startsWith('$')) {
          sanitizedObj[key] = sanitizeValue(val[key]);
        }
      }
      return sanitizedObj;
    }
    
    return val;
  };

  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  
  next();
};

/**
 * 2. Custom IP-Based General Rate Limiter
 * Blocks brute forcing general endpoints
 */
export const ipRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const limitWindow = 60 * 1000; // 1 minute window
  const maxRequests = 60; // 60 requests per minute

  let ipRecord = ipRateLimits.get(ip);

  if (!ipRecord) {
    ipRecord = { requests: [], blockedUntil: 0 };
    ipRateLimits.set(ip, ipRecord);
  }

  // Check if IP is temporarily blocked
  if (ipRecord.blockedUntil > now) {
    const remainingSeconds = Math.ceil((ipRecord.blockedUntil - now) / 1000);
    return res.status(429).json({
      message: `Too many requests from this IP. Please try again in ${remainingSeconds} seconds.`
    });
  }

  // Filter out requests older than the 1-minute window
  ipRecord.requests = ipRecord.requests.filter(timestamp => now - timestamp < limitWindow);

  if (ipRecord.requests.length >= maxRequests) {
    ipRecord.blockedUntil = now + (5 * 60 * 1000); // Block for 5 minutes
    return res.status(429).json({
      message: 'Suspicious request volume detected. Your IP has been temporarily restricted for 5 minutes.'
    });
  }

  ipRecord.requests.push(now);
  next();
};

/**
 * 3. Math CAPTCHA Utilities
 * Stateless generation and validation of mathematical CAPTCHA challenges
 */
export const generateCaptcha = () => {
  const num1 = Math.floor(Math.random() * 9) + 2; // 2 to 10
  const num2 = Math.floor(Math.random() * 8) + 2; // 2 to 9
  const result = num1 + num2;
  const equation = `${num1} + ${num2} = ?`;

  // Sign the answer into a short-lived token (valid for 3 minutes)
  const token = jwt.sign({ result }, CAPTCHA_SECRET, { expiresIn: '3m' });

  return { equation, token };
};

export const verifyCaptcha = (token, answer) => {
  if (!token || !answer) return false;
  try {
    const decoded = jwt.verify(token, CAPTCHA_SECRET);
    return Number(decoded.result) === Number(answer);
  } catch (err) {
    return false; // Token expired or invalid
  }
};
