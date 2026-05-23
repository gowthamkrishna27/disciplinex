import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { JsonDb } from '../models/fallback/jsonDb.js';
import { checkFallback } from '../config/db.js';

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

export const requireVerifiedUser = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Not authorized, no user session found' });
  }

  try {
    const isFallback = checkFallback();
    let user;
    if (isFallback) {
      user = JsonDb.findUserById(req.user.id);
    } else {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    // Restrict access if the user email is not verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: 'Access restricted: Please verify your email address to unlock this feature.',
        unverified: true 
      });
    }

    req.fullUser = user;
    next();
  } catch (error) {
    console.error('[Verified User Middleware] Verification check error:', error.message);
    res.status(500).json({ message: 'Internal server verification check failed' });
  }
};
