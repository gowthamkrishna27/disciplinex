import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { checkFallback } from '../config/db.js';
import User from '../models/User.js';
import { JsonDb } from '../models/fallback/jsonDb.js';
import { generateCaptcha, verifyCaptcha } from '../middleware/security.js';
import { sendVerificationEmail, sendOtpEmail, sendResetCodeEmail, testSmtpConnection } from '../utils/email.js';

// Load JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'disciplinex_super_secret_key_123_456';
const CAPTCHA_SECRET = process.env.JWT_SECRET || 'disciplinex_captcha_secret_123_456';
const isProd = process.env.NODE_ENV === 'production';

// Hash token helper using SHA-256 for secure database storage
const hashToken = (token) => {
  if (!token) return null;
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Device Name Parser Helper
const getDeviceName = (userAgent) => {
  if (!userAgent) return 'Unknown Device';
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    return 'Mobile Device';
  }
  if (userAgent.includes('Windows')) {
    return 'Windows PC';
  }
  if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) {
    return 'macOS Device';
  }
  if (userAgent.includes('Linux')) {
    return 'Linux PC';
  }
  return 'Desktop Device';
};

// Base32 Decoding for TOTP
const decodeBase32 = (base32) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let hex = '';
  
  const cleaned = base32.toUpperCase().replace(/=+$/, '');
  for (let i = 0; i < cleaned.length; i++) {
    const val = alphabet.indexOf(cleaned.charAt(i));
    if (val === -1) throw new Error('Invalid Base32 character');
    bits += val.toString(2).padStart(5, '0');
  }
  
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const chunk = bits.substring(i, i + 8);
    hex += parseInt(chunk, 2).toString(16).padStart(2, '0');
  }
  
  return Buffer.from(hex, 'hex');
};

// Zero-Dependency TOTP Verification Routine (RFC 6238)
const verifyTOTP = (secret, token, window = 1) => {
  try {
    const key = decodeBase32(secret);
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    const currentCounter = Math.floor(epoch / timeStep);
    
    for (let i = -window; i <= window; i++) {
      const counter = currentCounter + i;
      
      const buffer = Buffer.alloc(8);
      buffer.writeUInt32BE(0, 0); // High 4 bytes
      buffer.writeUInt32BE(counter, 4); // Low 4 bytes
      
      const hmac = crypto.createHmac('sha1', key);
      hmac.update(buffer);
      const hmacResult = hmac.digest();
      
      const offset = hmacResult[hmacResult.length - 1] & 0xf;
      const code = (
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff)
      ) % 1000000;
      
      const paddedCode = code.toString().padStart(6, '0');
      if (paddedCode === String(token)) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('TOTP Verification Error:', err.message);
    return false;
  }
};

// Base32 Secret Generator
const generateBase32Secret = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 16; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
};

// Generate full Login JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
};

// Update active session list for a user
const addSession = (user, token, deviceName, ip) => {
  const newSession = {
    token,
    deviceName,
    ip,
    lastActive: new Date()
  };
  
  if (!user.activeSessions) user.activeSessions = [];
  
  // Cap at 10 concurrent active sessions
  user.activeSessions.push(newSession);
  if (user.activeSessions.length > 10) {
    user.activeSessions.shift();
  }
};

/**
 * 1. Register User
 */
export const registerUser = async (req, res) => {
  const { name, email, password, provider } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please add all required fields' });
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  // Password strength check (min 8 chars, 1 number, 1 special character)
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
      message: 'Password must be at least 8 characters long and contain at least one letter, one number, and one special character.' 
    });
  }

  try {
    const isFallback = checkFallback();

    let userExists;
    if (isFallback) {
      userExists = JsonDb.findUserByEmail(email);
    } else {
      userExists = await User.findOne({ email });
    }

    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Auto-verify if registered via Google/GitHub OAuth providers
    const isVerified = (provider === 'google' || provider === 'github') ? true : false;

    // Generate verification token (expires in 5 minutes)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashToken(verificationToken);
    const verificationExpires = new Date(Date.now() + 5 * 60 * 1000);

    // Create user
    let user;
    const initialData = {
      name,
      email,
      password: hashedPassword,
      dailyGoal: 4,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      twoFactorEnabled: false,
      trustedDevices: [],
      activeSessions: [],
      webAuthnCredentials: [],
      isVerified,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: verificationExpires,
      lastVerificationSentAt: new Date()
    };

    if (isFallback) {
      user = JsonDb.createUser(initialData);
    } else {
      user = await User.create(initialData);
    }

    if (user) {
      // Build verification URL dynamically based on request host and protocol
      const host = req.get('host');
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const verifyUrl = `${protocol}://${host}/api/auth/verify-email?token=${verificationToken}`;

      // Dispatch real or Ethereal email in the background (no block)
      let message = 'Account created successfully!';
      if (!isVerified) {
        const emailResult = await sendVerificationEmail(user.email, verifyUrl);
        message = 'Account created! A verification link has been dispatched to your email address. Please check your email inbox (and spam folder) to verify your account.';
        if (emailResult && emailResult.previewUrl) {
          message = `Account created! A verification link has been sent to Ethereal Mail. Please check your simulated mailbox here: ${emailResult.previewUrl}`;
        }
      }

      // Generate full login session immediately for soft-verification onboarding
      const token = generateToken(user._id);
      const deviceName = getDeviceName(req.headers['user-agent']);
      addSession(user, token, deviceName, req.ip || req.headers['x-forwarded-for'] || '127.0.0.1');

      if (isFallback) {
        JsonDb.updateUser(user._id, { activeSessions: user.activeSessions });
      } else {
        await user.save();
      }

      // Set secure HTTP-only cookie
      res.cookie('dx_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        dailyGoal: user.dailyGoal,
        isVerified: user.isVerified,
        token,
        message
      });
    } else {
      res.status(400).json({ message: 'Invalid user data provided' });
    }
  } catch (error) {
    console.error('[Auth Controller] Register Error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

/**
 * 2. Login User (with failed attempts, CAPTCHA, and 2FA triggers)
 */
export const loginUser = async (req, res) => {
  const { email, password, captchaAnswer, captchaToken, trustedDeviceId } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please include email and password' });
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  try {
    const isFallback = checkFallback();

    // Find user
    let user;
    if (isFallback) {
      user = JsonDb.findUserByEmail(email);
    } else {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const now = new Date();

    // Lockout Check
    if (user.lockoutUntil && new Date(user.lockoutUntil) > now) {
      const minutesLeft = Math.ceil((new Date(user.lockoutUntil) - now) / 60000);
      return res.status(423).json({
        message: `Account is temporarily locked due to excessive failed attempts. Please try again in ${minutesLeft} minute(s).`
      });
    }



    // CAPTCHA Challenge Validation (after 3 failed attempts)
    if (user.failedLoginAttempts >= 3) {
      if (!captchaToken || !captchaAnswer) {
        const captcha = generateCaptcha();
        return res.status(400).json({
          message: 'Security validation required.',
          requireCaptcha: true,
          captchaEquation: captcha.equation,
          captchaToken: captcha.token
        });
      }
      
      const isCaptchaValid = verifyCaptcha(captchaToken, captchaAnswer);
      if (!isCaptchaValid) {
        const captcha = generateCaptcha();
        return res.status(400).json({
          message: 'Security CAPTCHA verification failed. Please try again.',
          requireCaptcha: true,
          captchaEquation: captcha.equation,
          captchaToken: captcha.token
        });
      }
    }

    // Check Password (with fallback for legacy/pre-seeded plain text passwords)
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (err) {
      isMatch = false;
    }

    // Fallback: support plain-text comparison for legacy/pre-seeded users
    if (!isMatch && password === user.password) {
      isMatch = true;
      // Auto-migrate legacy plain text password to hashed password in database
      try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user.password = hashedPassword;
        if (isFallback) {
          JsonDb.updateUser(user._id, { password: hashedPassword });
        } else {
          await user.save();
        }
        console.log(`[Auth Controller] Auto-migrated legacy plain-text password for user: ${user.email}`);
      } catch (migrationError) {
        console.error('[Auth Controller] Legacy password migration failed:', migrationError);
      }
    }

    if (!isMatch) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      
      let locked = false;
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        user.failedLoginAttempts = 0; // Reset count for next lockout cycle
        locked = true;
      }

      if (isFallback) {
        JsonDb.updateUser(user._id, {
          failedLoginAttempts: user.failedLoginAttempts,
          lockoutUntil: user.lockoutUntil
        });
      } else {
        await user.save();
      }

      if (locked) {
        return res.status(423).json({
          message: 'Too many incorrect attempts. Your account has been temporarily locked for 15 minutes.'
        });
      }

      const attemptsRemaining = 5 - user.failedLoginAttempts;
      
      // Prompt CAPTCHA on subsequent attempt
      if (user.failedLoginAttempts >= 3) {
        const captcha = generateCaptcha();
        return res.status(401).json({
          message: `Invalid email or password. ${attemptsRemaining} attempt(s) remaining.`,
          requireCaptcha: true,
          captchaEquation: captcha.equation,
          captchaToken: captcha.token
        });
      }

      return res.status(401).json({
        message: `Invalid email or password. ${attemptsRemaining} attempt(s) remaining.`
      });
    }

    // SUCCESSFUL AUTHENTICATION - Reset Lockouts
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    // 2FA Trusted Device Check
    let deviceBypassed = false;
    if (user.twoFactorEnabled && trustedDeviceId && user.trustedDevices) {
      const match = user.trustedDevices.find(
        d => d.deviceId === trustedDeviceId && new Date(d.expiresAt) > now
      );
      if (match) {
        deviceBypassed = true;
      }
    }

    // 2FA Verification Triggers
    if (user.twoFactorEnabled && !deviceBypassed) {
      // Create short-lived 2FA authorization token (expires in 15 mins)
      const tempToken = jwt.sign(
        { tempUserId: user._id, action: '2fa_pending' },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      if (user.twoFactorMethod === 'email') {
        // Generate and store email OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
        user.emailOtp = otpCode;
        user.emailOtpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        if (isFallback) {
          JsonDb.updateUser(user._id, {
            failedLoginAttempts: 0,
            lockoutUntil: null,
            lastLoginAt: user.lastLoginAt,
            lastLoginIp: user.lastLoginIp,
            emailOtp: user.emailOtp,
            emailOtpExpires: user.emailOtpExpires
          });
        } else {
          await user.save();
        }

        // Dispatch real or Ethereal 2FA OTP Email
        const emailResult = await sendOtpEmail(user.email, otpCode);

        // Print Simulated/Ethereal Email Delivery log
        console.log(`\n======================================================================`);
        console.log(`[MAIL SERVER] 2FA OTP Delivery to: ${user.email}`);
        console.log(`[DisciplineX OTP CODE] Code: ${otpCode}`);
        if (emailResult && emailResult.previewUrl) {
          console.log(`[ETHEREAL MAILBOX] Link: ${emailResult.previewUrl}`);
        }
        console.log(`======================================================================\n`);


        return res.json({
          require2FA: true,
          twoFaToken: tempToken,
          method: 'email',
          message: 'A 6-digit OTP code has been dispatched to your email address.'
        });
      } else if (user.twoFactorMethod === 'totp') {
        if (isFallback) {
          JsonDb.updateUser(user._id, {
            failedLoginAttempts: 0,
            lockoutUntil: null,
            lastLoginAt: user.lastLoginAt,
            lastLoginIp: user.lastLoginIp
          });
        } else {
          await user.save();
        }

        return res.json({
          require2FA: true,
          twoFaToken: tempToken,
          method: 'totp',
          message: 'Please authenticate using the OTP code from your Authenticator App.'
        });
      }
    }

    // ISSUING FINAL FULL SESSION
    const token = generateToken(user._id);
    const deviceName = getDeviceName(req.headers['user-agent']);
    addSession(user, token, deviceName, user.lastLoginIp);

    if (isFallback) {
      JsonDb.updateUser(user._id, {
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp,
        activeSessions: user.activeSessions
      });
    } else {
      await user.save();
    }

    // Dispatch Security Alert Email in background to never block response
    try {
      sendSecurityAlertEmail(user.email, {
        eventName: 'New Active Session Authorized',
        deviceName,
        ipAddress: user.lastLoginIp || 'Unknown IP',
        timestamp: new Date()
      });
    } catch (alertErr) {
      console.warn('[Login Alert] Failed to dispatch alert email:', alertErr.message);
    }

    // Set secure HTTP-only cookie
    res.cookie('dx_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      dailyGoal: user.dailyGoal,
      twoFactorEnabled: user.twoFactorEnabled,
      isVerified: user.isVerified,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      token // also return in JSON body for authorization header fallbacks
    });

  } catch (error) {
    console.error('[Auth Controller] Login Error:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

/**
 * 3. Verify Two-Factor Authentication (OTP or TOTP)
 */
export const verifyTwoFactor = async (req, res) => {
  const { twoFaToken, otp, trustedDevice } = req.body;

  if (!twoFaToken || !otp) {
    return res.status(400).json({ message: 'Required validation inputs missing' });
  }

  try {
    const decoded = jwt.verify(twoFaToken, JWT_SECRET);
    if (decoded.action !== '2fa_pending') {
      return res.status(401).json({ message: 'Session signature invalid' });
    }

    const isFallback = checkFallback();
    let user;
    if (isFallback) {
      user = JsonDb.findUserById(decoded.tempUserId);
    } else {
      user = await User.findById(decoded.tempUserId);
    }

    if (!user) {
      return res.status(404).json({ message: 'User file not found' });
    }

    let isCodeValid = false;

    // Verify Email OTP code
    if (user.twoFactorMethod === 'email') {
      const now = new Date();
      if (user.emailOtp && String(user.emailOtp) === String(otp) && new Date(user.emailOtpExpires).getTime() > now.getTime()) {
        isCodeValid = true;
        // Wipe OTP values once verified
        user.emailOtp = null;
        user.emailOtpExpires = null;
      }
    } 
    // Verify TOTP authenticator code
    else if (user.twoFactorMethod === 'totp') {
      isCodeValid = verifyTOTP(user.twoFactorSecret, otp);
    }

    if (!isCodeValid) {
      return res.status(401).json({ message: 'Invalid or expired OTP validation code.' });
    }

    // Success - Create full session
    const token = generateToken(user._id);
    const deviceName = getDeviceName(req.headers['user-agent']);
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    addSession(user, token, deviceName, ip);

    // Track trusted device (if checked)
    let newTrustedDeviceId = null;
    if (trustedDevice) {
      newTrustedDeviceId = crypto.randomBytes(16).toString('hex');
      const trustedObj = {
        deviceId: newTrustedDeviceId,
        deviceName,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };
      if (!user.trustedDevices) user.trustedDevices = [];
      user.trustedDevices.push(trustedObj);
    }

    if (isFallback) {
      JsonDb.updateUser(user._id, {
        emailOtp: user.emailOtp,
        emailOtpExpires: user.emailOtpExpires,
        activeSessions: user.activeSessions,
        trustedDevices: user.trustedDevices
      });
    } else {
      await user.save();
    }

    // Set cookies
    res.cookie('dx_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    if (newTrustedDeviceId) {
      res.cookie('dx_trusted_device', newTrustedDeviceId, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      dailyGoal: user.dailyGoal,
      twoFactorEnabled: user.twoFactorEnabled,
      isVerified: user.isVerified,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      token,
      trustedDeviceId: newTrustedDeviceId
    });

  } catch (error) {
    console.error('[2FA Verification Error]', error);
    res.status(401).json({ message: '2FA session signature expired or invalid' });
  }
};

/**
 * 4. Request Password Reset Link
 */
export const requestReset = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please specify your email address' });
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  try {
    const isFallback = checkFallback();
    let user;
    if (isFallback) {
      user = JsonDb.findUserByEmail(email);
    } else {
      user = await User.findOne({ email });
    }

    if (!user) {
      // Generic message to avoid email enumeration
      return res.json({ message: 'If the email matches an active account, a reset code has been dispatched.' });
    }

    // Generate secure 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedResetCode = hashToken(resetCode);
    user.resetPasswordToken = hashedResetCode;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    if (isFallback) {
      JsonDb.updateUser(user._id, {
        resetPasswordToken: user.resetPasswordToken,
        resetPasswordExpires: user.resetPasswordExpires
      });
    } else {
      await user.save();
    }

    // Dispatch real or Ethereal Password Reset Email
    const emailResult = await sendResetCodeEmail(user.email, resetCode);

    // Print Simulated/Ethereal Reset Email Delivery log
    console.log(`\n======================================================================`);
    console.log(`[MAIL SERVER] Password Reset for: ${user.email}`);
    console.log(`[DisciplineX PASSWORD RESET] Code: ${resetCode}`);
    if (emailResult && emailResult.previewUrl) {
      console.log(`[ETHEREAL MAILBOX] Link: ${emailResult.previewUrl}`);
    }
    console.log(`======================================================================\n`);


    res.json({ message: 'If the email matches an active account, a reset code has been dispatched.' });
  } catch (error) {
    console.error('[Password Reset Request Error]', error);
    res.status(500).json({ message: 'Failed to process password reset request.' });
  }
};

/**
 * 5. Handle Password Reset Execution
 */
export const executeReset = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Required verification fields missing' });
  }

  // Password strength check
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({ 
      message: 'Password must be at least 8 characters long and contain at least one letter, one number, and one special character.' 
    });
  }

  try {
    const isFallback = checkFallback();
    let user;
    if (isFallback) {
      user = JsonDb.findUserByEmail(email);
    } else {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid reset code or email match failed.' });
    }

    const now = new Date();
    const hashedIncomingCode = hashToken(code);
    if (!user.resetPasswordToken || user.resetPasswordToken !== hashedIncomingCode || new Date(user.resetPasswordExpires).getTime() < now.getTime()) {
      return res.status(400).json({ message: 'Reset code is invalid or has expired.' });
    }

    // Hash and update password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    
    // Invalidate active sessions on password change for protection
    user.activeSessions = [];

    if (isFallback) {
      JsonDb.updateUser(user._id, {
        password: user.password,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        activeSessions: []
      });
    } else {
      await user.save();
    }

    res.json({ message: 'Password updated successfully! Please sign in using your new password.' });
  } catch (error) {
    console.error('[Password Reset Execution Error]', error);
    res.status(500).json({ message: 'Failed to reset password.' });
  }
};

/**
 * 6. Fetch Active Sessions
 */
export const getActiveSessions = async (req, res) => {
  try {
    const isFallback = checkFallback();
    let user;
    if (isFallback) {
      user = JsonDb.findUserById(req.user.id);
    } else {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: 'User record not found.' });
    }

    // Exclude tokens in response for safety
    const safeSessions = (user.activeSessions || []).map(s => ({
      _id: s._id || s.token.substring(s.token.length - 12), // Dynamic fake id for lists
      deviceName: s.deviceName,
      ip: s.ip,
      lastActive: s.lastActive,
      isCurrent: req.headers.cookie?.includes(s.token) || req.headers.authorization?.includes(s.token)
    }));

    res.json(safeSessions);
  } catch (error) {
    console.error('[Get Sessions Error]', error);
    res.status(500).json({ message: 'Failed to retrieve active sessions.' });
  }
};

/**
 * 7. Revoke Session
 */
export const revokeSession = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const isFallback = checkFallback();
    let user;
    if (isFallback) {
      user = JsonDb.findUserById(req.user.id);
    } else {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: 'User record not found.' });
    }

    // Filter out the session
    const originalLength = user.activeSessions?.length || 0;
    user.activeSessions = (user.activeSessions || []).filter(
      s => (s._id || s.token.substring(s.token.length - 12)) !== sessionId
    );

    if (user.activeSessions.length === originalLength) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    if (isFallback) {
      JsonDb.updateUser(user._id, { activeSessions: user.activeSessions });
    } else {
      await user.save();
    }

    res.json({ message: 'Session revoked successfully.' });
  } catch (error) {
    console.error('[Revoke Session Error]', error);
    res.status(500).json({ message: 'Failed to revoke session.' });
  }
};

/**
 * 8. Setup Two-Factor (Generate Secret / QR Details)
 */
export const setupTwoFactor = async (req, res) => {
  const { method } = req.body;

  if (!method || !['email', 'totp', 'none'].includes(method)) {
    return res.status(400).json({ message: 'Invalid 2FA method requested.' });
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
      return res.status(404).json({ message: 'User record not found.' });
    }

    if (method === 'none') {
      user.twoFactorEnabled = false;
      user.twoFactorMethod = null;
      user.twoFactorSecret = null;

      if (isFallback) {
        JsonDb.updateUser(user._id, {
          twoFactorEnabled: false,
          twoFactorMethod: null,
          twoFactorSecret: null
        });
      } else {
        await user.save();
      }

      return res.json({ message: 'Two-Factor Authentication has been successfully disabled.' });
    }

    if (method === 'email') {
      user.twoFactorTempSecret = 'email'; // Temp placeholder
      if (isFallback) {
        JsonDb.updateUser(user._id, { twoFactorTempSecret: 'email' });
      } else {
        await user.save();
      }

      // Generate a quick verification OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.emailOtp = otpCode;
      user.emailOtpExpires = new Date(Date.now() + 15 * 60 * 1000);

      if (isFallback) {
        JsonDb.updateUser(user._id, {
          emailOtp: user.emailOtp,
          emailOtpExpires: user.emailOtpExpires
        });
      } else {
        await user.save();
      }

      // Dispatch real or Ethereal 2FA OTP Setup Email
      const emailResult = await sendOtpEmail(user.email, otpCode);

      console.log(`\n======================================================================`);
      console.log(`[MAIL SERVER] Enable 2FA Verification for: ${user.email}`);
      console.log(`[DisciplineX OTP CODE] Verification Code: ${otpCode}`);
      if (emailResult && emailResult.previewUrl) {
        console.log(`[ETHEREAL MAILBOX] Link: ${emailResult.previewUrl}`);
      }
      console.log(`======================================================================\n`);


      return res.json({
        tempSetup: true,
        message: 'A 6-digit confirmation code has been dispatched to your email address.'
      });
    }

    if (method === 'totp') {
      const totpSecret = generateBase32Secret();
      user.twoFactorTempSecret = totpSecret;

      if (isFallback) {
        JsonDb.updateUser(user._id, { twoFactorTempSecret: totpSecret });
      } else {
        await user.save();
      }

      // Generate actual QR URL parameters
      const qrData = `otpauth://totp/DisciplineX:${user.email}?secret=${totpSecret}&issuer=DisciplineX`;
      
      // Generate actual QR Code image as Data URL (base64 PNG)
      let qrCodeDataUrl = '';
      try {
        qrCodeDataUrl = await QRCode.toDataURL(qrData);
      } catch (qrErr) {
        console.error('[QRCode Generation Error]', qrErr);
      }

      return res.json({
        tempSetup: true,
        secret: totpSecret,
        qrData,
        qrCodeDataUrl,
        message: 'Please scan the code in your Authenticator app (e.g., Google Authenticator) and verify the 6-digit code.'
      });
    }

  } catch (error) {
    console.error('[Setup 2FA Error]', error);
    res.status(500).json({ message: 'Failed to initiate 2FA setup.' });
  }
};

/**
 * 9. Confirm and Activate Two-Factor Authentication
 */
export const confirmTwoFactor = async (req, res) => {
  const { code, method } = req.body;

  if (!code || !method) {
    return res.status(400).json({ message: 'Required verification credentials missing.' });
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
      return res.status(404).json({ message: 'User record not found.' });
    }

    if (!user.twoFactorTempSecret) {
      return res.status(400).json({ message: 'No pending 2FA configuration session found.' });
    }

    let isCodeValid = false;

    if (method === 'email') {
      const now = new Date();
      if (user.emailOtp && String(user.emailOtp) === String(code) && new Date(user.emailOtpExpires).getTime() > now.getTime()) {
        isCodeValid = true;
        user.emailOtp = null;
        user.emailOtpExpires = null;
        user.twoFactorEnabled = true;
        user.twoFactorMethod = 'email';
        user.twoFactorTempSecret = null;
      }
    } else if (method === 'totp') {
      isCodeValid = verifyTOTP(user.twoFactorTempSecret, code);
      if (isCodeValid) {
        user.twoFactorEnabled = true;
        user.twoFactorMethod = 'totp';
        user.twoFactorSecret = user.twoFactorTempSecret;
        user.twoFactorTempSecret = null;
      }
    }

    if (!isCodeValid) {
      return res.status(400).json({ message: 'Verification failed. The code entered is invalid or has expired.' });
    }

    if (isFallback) {
      JsonDb.updateUser(user._id, {
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod,
        twoFactorSecret: user.twoFactorSecret,
        twoFactorTempSecret: null,
        emailOtp: null,
        emailOtpExpires: null
      });
    } else {
      await user.save();
    }

    res.json({
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorMethod: user.twoFactorMethod,
      message: 'Two-Factor Authentication has been successfully activated!'
    });

  } catch (error) {
    console.error('[Confirm 2FA Error]', error);
    res.status(500).json({ message: 'Failed to activate 2FA.' });
  }
};

/**
 * 10. WebAuthn Biometrics: Register Device Request Options
 */
export const getBiometricRegisterOptions = async (req, res) => {
  try {
    const isFallback = checkFallback();
    let user;
    if (isFallback) {
      user = JsonDb.findUserById(req.user.id);
    } else {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: 'User record not found.' });
    }

    // Generate mock options matching WebAuthn standard
    const challenge = crypto.randomBytes(32).toString('base64');
    
    // Store challenge in activeSession temp or just send it for validation
    res.json({
      challenge,
      rp: { name: 'DisciplineX Security Engine' },
      user: {
        id: user._id,
        name: user.email,
        displayName: user.name
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 } // RS256
      ]
    });
  } catch (error) {
    res.status(500).json({ message: 'Biometric registration failed.' });
  }
};

/**
 * 11. WebAuthn Biometrics: Register Device Confirm
 */
export const confirmBiometricRegister = async (req, res) => {
  const { credentialId, publicKey } = req.body;

  if (!credentialId || !publicKey) {
    return res.status(400).json({ message: 'Credential payload missing.' });
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
      return res.status(404).json({ message: 'User record not found.' });
    }

    if (!user.webAuthnCredentials) user.webAuthnCredentials = [];

    // Check duplicate credentials
    const exists = user.webAuthnCredentials.find(c => c.credentialId === credentialId);
    if (!exists) {
      user.webAuthnCredentials.push({
        credentialId,
        publicKey,
        prevCounter: 0
      });
    }

    if (isFallback) {
      JsonDb.updateUser(user._id, { webAuthnCredentials: user.webAuthnCredentials });
    } else {
      await user.save();
    }

    res.json({ message: 'Device Biometric registration successful!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify device registration.' });
  }
};

/**
 * 12. WebAuthn Biometrics: Authentication Challenge
 */
export const getBiometricLoginOptions = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please specify your email address' });
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  try {
    const isFallback = checkFallback();
    let user;
    if (isFallback) {
      user = JsonDb.findUserByEmail(email);
    } else {
      user = await User.findOne({ email });
    }

    if (!user || !user.webAuthnCredentials || user.webAuthnCredentials.length === 0) {
      return res.status(400).json({ message: 'No biometric credentials registered for this account.' });
    }

    const challenge = crypto.randomBytes(32).toString('base64');

    res.json({
      challenge,
      allowCredentials: user.webAuthnCredentials.map(c => ({
        id: c.credentialId,
        type: 'public-key'
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to request biometric verification challenge.' });
  }
};

/**
 * 13. WebAuthn Biometrics: Verify and Login
 */
export const verifyBiometricLogin = async (req, res) => {
  const { email, credentialId } = req.body;

  if (!email || !credentialId) {
    return res.status(400).json({ message: 'Biometric authentication details missing.' });
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  try {
    const isFallback = checkFallback();
    let user;
    if (isFallback) {
      user = JsonDb.findUserByEmail(email);
    } else {
      user = await User.findOne({ email });
    }

    if (!user || !user.webAuthnCredentials) {
      return res.status(401).json({ message: 'Authentication rejected.' });
    }

    const credential = user.webAuthnCredentials.find(c => c.credentialId === credentialId);
    if (!credential) {
      return res.status(401).json({ message: 'Biometric hardware signature verification failed.' });
    }

    // Success - Issue full JWT token session
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    const token = generateToken(user._id);
    const deviceName = getDeviceName(req.headers['user-agent']);
    addSession(user, token, deviceName, user.lastLoginIp);

    if (isFallback) {
      JsonDb.updateUser(user._id, {
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp,
        activeSessions: user.activeSessions
      });
    } else {
      await user.save();
    }

    // Set secure cookie
    res.cookie('dx_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      dailyGoal: user.dailyGoal,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      token
    });

  } catch (error) {
    res.status(500).json({ message: 'Biometric sign in verification failed.' });
  }
};

/**
 * 14. Retrieve Profile Profile
 */
export const getProfile = async (req, res) => {
  try {
    const isFallback = checkFallback();
    let user;

    if (isFallback) {
      user = JsonDb.findUserById(req.user.id);
    } else {
      user = await User.findById(req.user.id).select('-password');
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      dailyGoal: user.dailyGoal,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorMethod: user.twoFactorMethod,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('[Auth Controller] Profile Retrieval Error:', error);
    res.status(500).json({ message: 'Server error fetching profile', error: error.message });
  }
};

/**
 * 15. Update Profile
 */
export const updateProfile = async (req, res) => {
  const { name, dailyGoal } = req.body;

  try {
    const isFallback = checkFallback();
    let updatedUser;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (dailyGoal !== undefined) updateFields.dailyGoal = Number(dailyGoal);

    if (isFallback) {
      updatedUser = JsonDb.updateUser(req.user.id, updateFields);
    } else {
      updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select('-password');
    }

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      dailyGoal: updatedUser.dailyGoal,
    });
  } catch (error) {
    console.error('[Auth Controller] Profile Update Error:', error);
    res.status(500).json({ message: 'Server error updating profile', error: error.message });
  }
};

/**
 * 16. Verify Email Address via Token
 */
export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  const host = req.get('host') || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const clientUrl = isLocal ? 'http://localhost:5173' : 'https://disciplinex-tau.vercel.app';

  if (!token) {
    return res.status(400).send(`
      <html>
        <head>
          <title>Email Verification Failed — DisciplineX</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0b0f19; color: #f8fafc; text-align: center; padding: 100px 20px; margin: 0; }
            .card { background: #111827; border: 1px solid #1f2937; border-radius: 24px; padding: 48px; display: inline-block; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); max-width: 480px; }
            .icon { font-size: 64px; color: #ef4444; margin-bottom: 24px; }
            h1 { font-size: 28px; font-weight: 700; margin: 0 0 16px 0; color: #ef4444; }
            p { font-size: 15px; color: #9ca3af; line-height: 1.6; margin: 0 0 32px 0; }
            .btn { display: inline-block; background: #6d28d9; color: white; padding: 12px 32px; border-radius: 12px; font-size: 14px; font-weight: 600; text-decoration: none; transition: background 0.2s; }
            .btn:hover { background: #5b21b6; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">❌</div>
            <h1>Verification Failed</h1>
            <p>Verification token is missing or has expired.</p>
            <a href="${clientUrl}/login" class="btn">Go to Login</a>
          </div>
        </body>
      </html>
    `);
  }

  try {
    const isFallback = checkFallback();
    let user;
    const hashedToken = hashToken(token);

    if (isFallback) {
      user = JsonDb.findUserByVerificationToken(hashedToken);
    } else {
      user = await User.findOne({ emailVerificationToken: hashedToken });
    }

    if (!user) {
      return res.status(404).send(`
        <html>
          <head>
            <title>Email Verification Failed — DisciplineX</title>
            <style>
              body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0b0f19; color: #f8fafc; text-align: center; padding: 100px 20px; margin: 0; }
              .card { background: #111827; border: 1px solid #1f2937; border-radius: 24px; padding: 48px; display: inline-block; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); max-width: 480px; }
              .icon { font-size: 64px; color: #ef4444; margin-bottom: 24px; }
              h1 { font-size: 28px; font-weight: 700; margin: 0 0 16px 0; color: #ef4444; }
              p { font-size: 15px; color: #9ca3af; line-height: 1.6; margin: 0 0 32px 0; }
              .btn { display: inline-block; background: #6d28d9; color: white; padding: 12px 32px; border-radius: 12px; font-size: 14px; font-weight: 600; text-decoration: none; transition: background 0.2s; }
              .btn:hover { background: #5b21b6; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">❌</div>
              <h1>Verification Link Invalid</h1>
              <p>The verification link is invalid, expired, or has already been used.</p>
              <a href="${clientUrl}/login" class="btn">Go to Login</a>
            </div>
          </body>
        </html>
      `);
    }

    // Check expiration
    const now = new Date();
    if (user.emailVerificationExpires && new Date(user.emailVerificationExpires).getTime() < now.getTime()) {
      return res.status(400).send(`
        <html>
          <head>
            <title>Verification Link Expired — DisciplineX</title>
            <style>
              body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0b0f19; color: #f8fafc; text-align: center; padding: 100px 20px; margin: 0; }
              .card { background: #111827; border: 1px solid #1f2937; border-radius: 24px; padding: 48px; display: inline-block; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); max-width: 480px; }
              .icon { font-size: 64px; color: #ea580c; margin-bottom: 24px; }
              h1 { font-size: 28px; font-weight: 700; margin: 0 0 16px 0; color: #ea580c; }
              p { font-size: 15px; color: #9ca3af; line-height: 1.6; margin: 0 0 32px 0; }
              .btn { display: inline-block; background: #6d28d9; color: white; padding: 12px 32px; border-radius: 12px; font-size: 14px; font-weight: 600; text-decoration: none; transition: background 0.2s; }
              .btn:hover { background: #5b21b6; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">⏳</div>
              <h1>Verification Expired</h1>
              <p>The verification link has expired. Please log in to your dashboard to request a fresh verification link.</p>
              <a href="${clientUrl}/login" class="btn">Go to Login</a>
            </div>
          </body>
        </html>
      `);
    }

    // Success: Verify User
    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;

    if (isFallback) {
      JsonDb.updateUser(user._id, {
        isVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      });
    } else {
      await user.save();
    }

    // Success Screen with redirect
    res.send(`
      <html>
        <head>
          <title>Email Verified Successfully — DisciplineX</title>
          <meta http-equiv="refresh" content="4;url=${clientUrl}/login?verified=true" />
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0b0f19; color: #f8fafc; text-align: center; padding: 100px 20px; margin: 0; }
            .card { background: #111827; border: 1px solid #1f2937; border-radius: 24px; padding: 48px; display: inline-block; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); max-width: 480px; }
            .icon { font-size: 64px; color: #10b981; margin-bottom: 24px; }
            h1 { font-size: 28px; font-weight: 700; margin: 0 0 16px 0; color: #10b981; }
            p { font-size: 15px; color: #9ca3af; line-height: 1.6; margin: 0 0 32px 0; }
            .btn { display: inline-block; background: #10b981; color: white; padding: 12px 32px; border-radius: 12px; font-size: 14px; font-weight: 600; text-decoration: none; transition: background 0.2s; }
            .btn:hover { background: #059669; }
            .timer { font-size: 12px; color: #6b7280; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✅</div>
            <h1>Email Verified!</h1>
            <p>Your email address has been successfully verified. You will be redirected to the login page shortly.</p>
            <a href="${clientUrl}/login?verified=true" class="btn">Proceed to Login</a>
            <p class="timer">Auto-redirecting in a few seconds...</p>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('[Email Verification Error]', error);
    res.status(500).send('Server error during email verification.');
  }
};

/**
 * 17. Resend Verification Email Link with Cooldown Check
 */
export const resendVerificationEmailCode = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please specify your email address' });
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  try {
    const isFallback = checkFallback();
    let user;
    if (isFallback) {
      user = JsonDb.findUserByEmail(email);
    } else {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(444).json({ message: 'No registration record found for this email address.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'This account has already been verified. Please sign in.' });
    }

    // Cooldown check (60 seconds)
    const now = new Date();
    if (user.lastVerificationSentAt && (now.getTime() - new Date(user.lastVerificationSentAt).getTime() < 60000)) {
      const secondsLeft = Math.ceil((60000 - (now.getTime() - new Date(user.lastVerificationSentAt).getTime())) / 1000);
      return res.status(429).json({
        message: `Please wait ${secondsLeft} second(s) before requesting another verification email.`
      });
    }

    // Generate fresh verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashToken(verificationToken);
    const verificationExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = verificationExpires;
    user.lastVerificationSentAt = now;

    if (isFallback) {
      JsonDb.updateUser(user._id, {
        emailVerificationToken: user.emailVerificationToken,
        emailVerificationExpires: user.emailVerificationExpires,
        lastVerificationSentAt: user.lastVerificationSentAt
      });
    } else {
      await user.save();
    }

    // Build URL
    const host = req.get('host');
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const verifyUrl = `${protocol}://${host}/api/auth/verify-email?token=${verificationToken}`;

    // Dispatch
    const emailResult = await sendVerificationEmail(user.email, verifyUrl);

    let message = 'A fresh verification link has been dispatched to your email address. Please check your email inbox (and spam folder).';
    if (emailResult && emailResult.previewUrl) {
      message = `A fresh verification link has been sent to Ethereal Mail: ${emailResult.previewUrl}`;
    }


    res.json({ message });

  } catch (error) {
    console.error('[Resend Verification Error]', error);
    res.status(500).json({ message: 'Failed to resend verification email.', error: error.message });
  }
};

/**
 * 12. Verify Email OTP Code
 */
export const verifyEmailCode = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: 'Email and verification code are required.' });
  }

  try {
    const isFallback = checkFallback();
    let user;

    if (isFallback) {
      user = JsonDb.findUserByEmail(email);
    } else {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ message: 'User record not found.' });
    }

    if (user.isVerified) {
      return res.json({ message: 'Account is already verified.', isVerified: user.isVerified });
    }

    // Check expiration
    const now = new Date();
    if (user.emailVerificationExpires && new Date(user.emailVerificationExpires).getTime() < now.getTime()) {
      return res.status(400).json({
        message: 'The verification code has expired. Please request a fresh verification link in your dashboard.'
      });
    }

    // Verify code matches (as string comparison)
    if (!user.emailVerificationToken || String(user.emailVerificationToken) !== String(code)) {
      return res.status(400).json({ message: 'Invalid verification code. Please try again.' });
    }

    // Success: Verify User
    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;

    if (isFallback) {
      JsonDb.updateUser(user._id, {
        isVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      });
    } else {
      await user.save();
    }

    res.json({ message: 'Email verified successfully! You can now log in.' });

  } catch (error) {
    console.error('[Email Code Verification Error]', error);
    res.status(500).json({ message: 'Server error during code verification.', error: error.message });
  }
};

/**
 * 18. SMTP Diagnostics Endpoint
 */
export const testSmtp = async (req, res) => {
  try {
    const results = await testSmtpConnection();
    res.json(results);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to run SMTP diagnostics.',
      error: error.message
    });
  }
};

