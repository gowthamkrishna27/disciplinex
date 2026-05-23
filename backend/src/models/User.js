import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  dailyGoal: {
    type: Number,
    default: 4, // default 4 hours / tasks
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockoutUntil: {
    type: Date,
    default: null,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorMethod: {
    type: String,
    enum: ['email', 'totp', null],
    default: null,
  },
  twoFactorSecret: {
    type: String,
    default: null,
  },
  twoFactorTempSecret: {
    type: String,
    default: null,
  },
  emailOtp: {
    type: String,
    default: null,
  },
  emailOtpExpires: {
    type: Date,
    default: null,
  },
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
  lastLoginIp: {
    type: String,
    default: null,
  },
  trustedDevices: [
    {
      deviceId: String,
      deviceName: String,
      expiresAt: Date,
    }
  ],
  activeSessions: [
    {
      token: String,
      deviceName: String,
      ip: String,
      lastActive: Date,
    }
  ],
  webAuthnCredentials: [
    {
      credentialId: String,
      publicKey: String,
      prevCounter: {
        type: Number,
        default: 0,
      },
    }
  ],
  isVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
    default: null,
  },
  emailVerificationExpires: {
    type: Date,
    default: null,
  },
  lastVerificationSentAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index to automatically purge unverified users from MongoDB after their verification window expires
UserSchema.index({ emailVerificationExpires: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('User', UserSchema);
