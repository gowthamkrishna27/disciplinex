import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import https from 'https';
import { checkFallback } from './db.js';
import User from '../models/User.js';
import { JsonDb } from '../models/fallback/jsonDb.js';

passport.serializeUser((user, done) => {
  done(null, user._id || user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const isFallback = checkFallback();
    let user;
    if (isFallback) {
      user = JsonDb.findUserById(id);
    } else {
      user = await User.findById(id);
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Configure GitHub Strategy
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Ov23litjRlZahy0jeZuE';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '7de021edd866237535df638b06c8f28577f1b13e';
const callbackURL = process.env.GITHUB_CALLBACK_URL || 'https://disciplinex-7c8o.onrender.com/api/auth/github/callback';

passport.use(
  new GitHubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: callbackURL,
      scope: ['user:email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log(`[Passport GitHub Strategy] callback triggered for githubId: ${profile.id}`);
        const isFallback = checkFallback();

        // 1. Resolve email safely (request user:email scope + fetch private emails via GitHub api)
        let email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

        if (!email && accessToken) {
          console.log('[Passport GitHub Strategy] Primary email not returned in profile. Querying GitHub API...');
          email = await new Promise((resolve) => {
            const options = {
              hostname: 'api.github.com',
              path: '/user/emails',
              method: 'GET',
              headers: {
                'User-Agent': 'DisciplineX-OAuth',
                'Authorization': `token ${accessToken}`,
              },
            };

            https.get(options, (res) => {
              let rawData = '';
              res.on('data', (chunk) => (rawData += chunk));
              res.on('end', () => {
                try {
                  const emails = JSON.parse(rawData);
                  if (Array.isArray(emails)) {
                    const primaryEmail = emails.find((e) => e.primary) || emails[0];
                    resolve(primaryEmail ? primaryEmail.email : null);
                  } else {
                    resolve(null);
                  }
                } catch (e) {
                  resolve(null);
                }
              });
            }).on('error', () => {
              resolve(null);
            });
          });
        }

        if (!email) {
          // If all else fails, use a unique placeholder email based on githubId
          email = `${profile.username || profile.id}@github.disciplinex.com`;
          console.warn(`[Passport GitHub Strategy] Could not retrieve verified email. Using placeholder: ${email}`);
        }

        const username = profile.username || profile.displayName || profile.id;
        const displayName = profile.displayName || profile.username || 'GitHub User';
        const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

        // 2. Query user by email or by githubId
        let user;
        if (isFallback) {
          user = JsonDb.findUserByEmail(email);
        } else {
          user = await User.findOne({ $or: [{ email }, { githubId: profile.id }] });
        }

        // 3. User already exists - update GitHub fields if missing & login
        if (user) {
          console.log(`[Passport GitHub Strategy] Logging in existing user: ${email}`);
          const updates = {};
          if (!user.githubId) updates.githubId = profile.id;
          if (!user.username) updates.username = username;
          if (!user.avatar) updates.avatar = avatar;
          if (!user.isVerified) updates.isVerified = true; // Auto-verify

          if (Object.keys(updates).length > 0) {
            if (isFallback) {
              user = JsonDb.updateUser(user._id, updates);
            } else {
              user = await User.findByIdAndUpdate(user._id, { $set: updates }, { new: true });
            }
          }
          return done(null, user);
        }

        // 4. Register new user profile with secure random password
        console.log(`[Passport GitHub Strategy] Registering new user via GitHub: ${email}`);
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);

        const newUserData = {
          name: displayName,
          email: email,
          password: hashedPassword,
          dailyGoal: 4,
          failedLoginAttempts: 0,
          lockoutUntil: null,
          twoFactorEnabled: false,
          trustedDevices: [],
          activeSessions: [],
          webAuthnCredentials: [],
          isVerified: true, // OAuth provider profiles are pre-verified
          githubId: profile.id,
          username: username,
          avatar: avatar,
          createdAt: new Date(),
        };

        if (isFallback) {
          user = JsonDb.createUser(newUserData);
        } else {
          user = await User.create(newUserData);
        }

        return done(null, user);
      } catch (err) {
        console.error('[Passport GitHub Strategy] Error in strategy verify callback:', err);
        return done(err, null);
      }
    }
  )
);

export default passport;
