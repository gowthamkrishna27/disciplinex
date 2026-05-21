import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const protect = async (req, res, next) => {
  let token;

  // 1. Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // 2. Check secure cookies
  else if (req.headers.cookie) {
    const cookies = {};
    req.headers.cookie.split(';').forEach(c => {
      const parts = c.split('=');
      cookies[parts.shift().trim()] = decodeURIComponent(parts.join('='));
    });
    if (cookies.dx_token) {
      token = cookies.dx_token;
    }
  }

  if (token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'disciplinex_super_secret_key_123_456');

      // Add user info to request
      req.user = {
        id: decoded.userId
      };

      next();
    } catch (error) {
      console.error('[Auth Middleware] Token validation failed:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};
