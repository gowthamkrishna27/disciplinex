import express from 'express';
import {
  registerUser,
  loginUser,
  verifyEmail,
  verifyTwoFactor,
  requestReset,
  executeReset,
  getActiveSessions,
  revokeSession,
  setupTwoFactor,
  confirmTwoFactor,
  getBiometricRegisterOptions,
  confirmBiometricRegister,
  getBiometricLoginOptions,
  verifyBiometricLogin,
  getProfile,
  updateProfile
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// General Registration and Login
router.post('/signup', registerUser);
router.get('/verify-email', verifyEmail);
router.post('/login', loginUser);
router.post('/verify-2fa', verifyTwoFactor);

// Password Resets
router.post('/forgot-password', requestReset);
router.post('/reset-password', executeReset);

// Profile
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// Active Sessions CRUD
router.get('/sessions', protect, getActiveSessions);
router.delete('/sessions/:sessionId', protect, revokeSession);

// Two-Factor Setup Control
router.post('/setup-2fa', protect, setupTwoFactor);
router.post('/confirm-2fa', protect, confirmTwoFactor);

// WebAuthn Biometrics
router.get('/webauthn/register-options', protect, getBiometricRegisterOptions);
router.post('/webauthn/register-confirm', protect, confirmBiometricRegister);
router.post('/webauthn/login-options', getBiometricLoginOptions);
router.post('/webauthn/login-verify', verifyBiometricLogin);

export default router;
