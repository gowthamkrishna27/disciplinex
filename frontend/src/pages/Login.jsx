import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarRange, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  KeyRound, 
  RefreshCw, 
  CheckCircle2, 
  ChevronLeft, 
  Smartphone,
  Shield
} from 'lucide-react';
import api, { API_BASE } from '../services/api';

export const Login = () => {
  // Navigation / View states: login, signup, 2fa, forgot, reset
  const [view, setView] = useState('login'); 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [trustedDevice, setTrustedDevice] = useState(false);

  // Strength meter
  const [passwordStrength, setPasswordStrength] = useState(0);

  // CAPTCHA
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const [captchaEquation, setCaptchaEquation] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  // 2FA pending parameters
  const [twoFaToken, setTwoFaToken] = useState('');
  const [twoFaMethod, setTwoFaMethod] = useState('');
  const [otp, setOtp] = useState('');

  // Password reset flow
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetPasswordStrength, setResetPasswordStrength] = useState(0);

  // Notifications
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingState, setLoadingState] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Email verification flow states
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  // Railway Enterprise System states
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Handle 60-second resend verification link cooldown countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const renderMessageWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80 transition break-all font-semibold ml-1"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const { 
    login, 
    signup, 
    verifyEmailCode,
    resendVerification,
    verify2FA,
    inactivityLoggedOut,
    setInactivityLoggedOut,
    isDark
  } = useAuth();

  const handleGoogleCredentialResponse = async (response) => {
    setFormError('');
    setSuccessMessage('');
    setLoadingState(true);
    setLoadingMessage('Authenticating with Google...');

    try {
      const idToken = response.credential;
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const profile = JSON.parse(jsonPayload);
      const { email, name, sub: googleId } = profile;

      console.log('[Google OAuth] Authenticated:', name, email);
      const googlePassword = `google_oauth_fallback_sec_${googleId}_123!`;

      try {
        console.log('[Google OAuth] Attempting automatic login...');
        await login(email, googlePassword);
        console.log('[Google OAuth] Login successful!');
      } catch (loginErr) {
        console.log('[Google OAuth] User not registered. Registering with Google provider...');
        try {
          const signupRes = await signup(name, email, googlePassword, 'google');
          console.log('[Google OAuth] Registration successful:', signupRes);
        } catch (signupErr) {
          throw new Error(signupErr.message || 'Failed to complete Google Sign-up.');
        }
      }
    } catch (err) {
      console.error('[Google OAuth] Error:', err);
      setFormError(err.message || 'Google Authentication failed.');
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    let observer;
    const initializeGoogleSignIn = () => {
      if (window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: "866577965805-saof2fms48ppama7f06f45pb9j4ad3aa.apps.googleusercontent.com",
            callback: handleGoogleCredentialResponse,
          });
          
          const renderButtons = () => {
            const btnEl = document.getElementById("googleSignInBtn");
            if (btnEl) {
              btnEl.innerHTML = ''; // clear any prior button state to prevent duplications
              window.google.accounts.id.renderButton(btnEl, {
                theme: isDark ? "filled_blue" : "outline",
                size: "large",
                width: 320,
                text: view === 'signup' ? 'signup_with' : 'signin_with',
                shape: "pill"
              });
            }
          };

          renderButtons();

          // Observe view changes to re-render the button anchor when it mounts
          observer = new MutationObserver(() => {
            renderButtons();
          });
          observer.observe(document.body, { childList: true, subtree: true });
        } catch (err) {
          console.error('[Google OAuth] Init Error:', err);
        }
      }
    };

    // Check if the script is already added in the document to prevent duplication
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleSignIn;
      document.body.appendChild(script);
    } else {
      if (window.google) {
        initializeGoogleSignIn();
      } else {
        script.onload = initializeGoogleSignIn;
      }
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [view, isDark]);

  // Evaluate password strength
  useEffect(() => {
    const evaluateStrength = (val) => {
      if (!val) return 0;
      let score = 0;
      if (val.length >= 8) score += 1;
      if (/[0-9]/.test(val) && /[A-Za-z]/.test(val)) score += 1;
      if (/[@$!%*#?&]/.test(val)) score += 1;
      return score;
    };
    setPasswordStrength(evaluateStrength(password));
  }, [password]);

  useEffect(() => {
    const evaluateStrength = (val) => {
      if (!val) return 0;
      let score = 0;
      if (val.length >= 8) score += 1;
      if (/[0-9]/.test(val) && /[A-Za-z]/.test(val)) score += 1;
      if (/[@$!%*#?&]/.test(val)) score += 1;
      return score;
    };
    setResetPasswordStrength(evaluateStrength(newPassword));
  }, [newPassword]);

  useEffect(() => {
    document.title = 'Sign In — DisciplineX';

    // Parse query params to detect email verification success
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      setSuccessMessage('Email address verified successfully! You can now sign in.');
      // Clean up URL query parameter without reloading page
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Pre-warm: silently ping the backend health endpoint to wake up Render from cold sleep
    // By the time the user types their email + password, the server should be fully awake
    fetch(API_BASE.replace('/api', '/api/health'), { method: 'GET', mode: 'cors' })
      .then(r => r.json())
      .then(d => console.log('[Pre-warm] Backend is awake:', d.status, d.databaseMode))
      .catch(() => console.log('[Pre-warm] Backend ping sent (server may be waking up).'));
  }, []);

  // Safety-net: forcefully reset loading state after 100 seconds to prevent permanent freeze
  // (Render free-tier cold starts can take 50-90 seconds)
  useEffect(() => {
    if (!loadingState) return;

    // Dynamic loading message: show server cold-start notice after 5 seconds
    const initialMessages = {
      'signup': 'Creating Workspace...',
      'login': 'Verifying Credentials...',
      '2fa': 'Validating Token...',
      'forgot-password': 'Dispatching OTP Code...',
      'reset-password': 'Updating Credentials...',
      'verify-email-code': 'Verifying Code...'
    };
    setLoadingMessage(initialMessages[view] || 'Processing...');
    const slowTimer = setTimeout(() => {
      setLoadingMessage('Server is waking up, please wait...');
    }, 5000);
    const slowerTimer = setTimeout(() => {
      setLoadingMessage('Almost there — cold start taking a bit longer...');
    }, 30000);

    const safetyTimer = setTimeout(() => {
      console.error('[Login Safety Net] Loading state was stuck for 100 seconds. Force-resetting.');
      setLoadingState(false);
      setFormError('The request took too long. The server may be starting up — please wait a moment and try again.');
    }, 100000);
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(slowerTimer);
      clearTimeout(safetyTimer);
    };
  }, [loadingState]);

  // Handle standard login / signup submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    setInactivityLoggedOut(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (view === 'signup') {
      if (!name || !email || !password) {
        setFormError('Please fill out all fields.');
        return;
      }
      if (!emailRegex.test(email)) {
        setFormError('Please enter a valid email address.');
        return;
      }
      if (passwordStrength < 2) {
        setFormError('Please choose a stronger password.');
        return;
      }

      console.log('[Login] Starting signup request...');
      setLoadingState(true);
      try {
        const resData = await signup(name, email, password);
        console.log('[Login] Signup response received:', resData);
        setSuccessMessage(resData?.message || 'Account created successfully! Please check your email to verify your account.');
        setView('login');
        setPassword('');
        setName('');
      } catch (err) {
        console.error('[Login] Signup error:', err.message);
        setFormError(err.message || 'Registration failed.');
      } finally {
        console.log('[Login] Signup finally block - resetting loading state.');
        setLoadingState(false);
      }
    } 
    else if (view === 'login') {
      if (!email || !password) {
        setFormError('Please enter both email and password.');
        return;
      }
      if (!emailRegex.test(email)) {
        setFormError('Please enter a valid email address.');
        return;
      }
      if (requireCaptcha && !captchaAnswer) {
        setFormError('Security validation equation answer is required.');
        return;
      }

      console.log('[Login] Starting login request...');
      setLoadingState(true);
      try {
        // Retrieve trusted device cookie ID if exists
        const cookieId = document.cookie
          .split('; ')
          .find(row => row.startsWith('dx_trusted_device='))
          ?.split('=')[1] || null;

        console.log('[Login] Calling AuthContext login...');
        const data = await login(email, password, captchaAnswer, captchaToken, cookieId);
        console.log('[Login] Login response received:', JSON.stringify(data).substring(0, 200));
        
        if (data && data.require2FA) {
          console.log('[Login] 2FA required, switching view.');
          setTwoFaToken(data.twoFaToken);
          setTwoFaMethod(data.method);
          setSuccessMessage(data.message);
          setView('2fa');
          setOtp('');
        }
      } catch (err) {
        console.error('[Login] Login error:', err.message);
        setFormError(err.message || 'Authentication failed.');

        // Handle unverified email login attempts
        if (err.data && err.data.notVerified) {
          setShowVerificationBanner(true);
          setUnverifiedEmail(email);
        }
        
        // Check if CAPTCHA challenge is requested
        if (err.data && err.data.requireCaptcha) {
          setRequireCaptcha(true);
          setCaptchaEquation(err.data.captchaEquation);
          setCaptchaToken(err.data.captchaToken);
          setCaptchaAnswer('');
        }
      } finally {
        console.log('[Login] Login finally block - resetting loading state.');
        setLoadingState(false);
      }
    }
  };

  // Handle Email OTP verification code submission
  const handleEmailCodeVerify = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!verificationCode) {
      setFormError('Please enter the 6-digit verification code.');
      return;
    }

    setLoadingState(true);
    try {
      const res = await verifyEmailCode(verificationEmail, verificationCode);
      setSuccessMessage(res?.message || 'Email verified successfully! Please log in.');
      setView('login');
      setVerificationCode('');
    } catch (err) {
      setFormError(err.message || 'Verification failed. The code may be invalid or expired.');
    } finally {
      setLoadingState(false);
    }
  };

  // Handle Resend Verification Email Link
  const handleResendVerification = async () => {
    if (cooldownSeconds > 0) return;
    setFormError('');
    setSuccessMessage('');
    setLoadingState(true);
    setLoadingMessage('Resending link...');

    try {
      const targetEmail = unverifiedEmail || email;
      const res = await resendVerification(targetEmail);
      setSuccessMessage(res?.message || 'A fresh verification link has been dispatched to your email address.');
      setCooldownSeconds(60); // 60 seconds cooldown
    } catch (err) {
      setFormError(err.message || 'Failed to resend verification link.');
    } finally {
      setLoadingState(false);
    }
  };

  // Handle 2FA verification submission
  const handle2FAVerify = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    
    if (!otp) {
      setFormError('Please enter the 6-digit OTP code.');
      return;
    }

    setLoadingState(true);
    try {
      await verify2FA(twoFaToken, otp, trustedDevice);
    } catch (err) {
      setFormError(err.message || 'Verification code is invalid or expired.');
    } finally {
      setLoadingState(false);
    }
  };

  // Refresh CAPTCHA challenge statelessly
  const handleRefreshCaptcha = async () => {
    setFormError('');
    try {
      // Sending a login attempt with invalid details triggers a fresh signed CAPTCHA from backend
      const data = await api.post('/auth/login', { email, password: ' ' });
    } catch (err) {
      if (err.data && err.data.requireCaptcha) {
        setRequireCaptcha(true);
        setCaptchaEquation(err.data.captchaEquation);
        setCaptchaToken(err.data.captchaToken);
        setCaptchaAnswer('');
      }
    }
  };

  // Handle forgot password email dispatch
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!resetEmail) {
      setFormError('Please provide your email address.');
      return;
    }
    if (!emailRegex.test(resetEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setLoadingState(true);
    try {
      const data = await api.post('/auth/forgot-password', { email: resetEmail });
      setSuccessMessage(data.message);
      setView('reset-password');
      setResetCode('');
      setNewPassword('');
    } catch (err) {
      setFormError(err.message || 'Failed to dispatch reset code.');
    } finally {
      setLoadingState(false);
    }
  };

  // Handle new password reset submission
  const handleExecuteReset = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!resetCode || !newPassword) {
      setFormError('Please enter both the OTP code and new password.');
      return;
    }
    if (resetPasswordStrength < 2) {
      setFormError('Your new password does not meet security requirements.');
      return;
    }

    setLoadingState(true);
    try {
      const data = await api.post('/auth/reset-password', {
        email: resetEmail,
        code: resetCode,
        newPassword
      });
      setSuccessMessage(data.message);
      setView('login');
      setEmail(resetEmail);
      setPassword('');
    } catch (err) {
      setFormError(err.message || 'Failed to update credentials.');
    } finally {
      setLoadingState(false);
    }
  };

  // Biometric sign in removed for straightforward UX

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark px-4 font-sans transition-colors duration-300">
      
      {/* Biometric Scanning Overlay Removed */}

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-bg-card-light dark:bg-bg-card-dark border border-border-light dark:border-border-dark rounded-2xl p-8 card-shadow transition-all duration-300">
        
        {/* Connection header removed for straightforward content */}

        {/* Global Notifications */}
        {inactivityLoggedOut && (
          <div className="mb-6 p-4 rounded-xl bg-brand-amber/5 border border-brand-amber/20 text-brand-amber text-xs font-semibold text-center leading-relaxed">
            Your secure session expired due to inactivity. Please sign in again.
          </div>
        )}

        {formError && (
          <div className="mb-6 p-4 rounded-xl bg-brand-red/5 border border-brand-red/20 text-brand-red text-xs font-medium text-center flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{renderMessageWithLinks(formError)}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-brand-green/5 border border-brand-green/20 text-brand-green text-xs font-semibold text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{renderMessageWithLinks(successMessage)}</span>
          </div>
        )}

        {showVerificationBanner && (
          <div className="mb-6 p-4 rounded-xl bg-brand-purple/5 border border-brand-purple/20 text-xs text-center flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-1.5 font-semibold text-brand-purple">
              <Mail className="w-4 h-4 flex-shrink-0 animate-bounce" />
              <span>Verify Your Workspace Identity</span>
            </div>
            <p className="text-color-text-muted-light dark:text-color-text-muted-dark m-0 leading-relaxed">
              Your account for <strong>{unverifiedEmail}</strong> is registered but hasn't been verified yet. Check your inbox, or request a new verification link below:
            </p>
            <button
              type="button"
              disabled={loadingState || cooldownSeconds > 0}
              onClick={handleResendVerification}
              className="px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 disabled:bg-brand-purple/40 text-white rounded-lg font-semibold transition cursor-pointer select-none text-[11px] flex items-center gap-1.5"
            >
              {cooldownSeconds > 0 ? (
                <span>Resend available in {cooldownSeconds}s</span>
              ) : (
                <span>Resend Verification Link</span>
              )}
            </button>
          </div>
        )}

        {/* ----------------- 1. LOGIN VIEW ----------------- */}
        {view === 'login' && (
          <div>
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple mb-3">
                <svg className="w-6 h-6" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M25 25H50C62 25 70 32 70 45C70 58 62 65 50 65H25V25Z" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" />
                  <path d="M70 25L35 65" stroke="#7c3aed" strokeWidth="12" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="text-3xl font-display font-semibold tracking-tight text-color-text-light dark:text-color-text-dark m-0">
                DisciplineX
              </h1>
              <p className="text-sm text-color-text-muted-light dark:text-color-text-muted-dark mt-1.5">
                Consistency over intensity. Plan your day.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark mb-1.5">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-color-text-muted-light dark:text-color-text-muted-dark">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-border-light dark:border-border-dark rounded-xl text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:text-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot-password');
                      setFormError('');
                      setSuccessMessage('');
                    }}
                    className="text-xs text-brand-purple hover:underline font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-color-text-muted-light dark:text-color-text-muted-dark">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-transparent border border-border-light dark:border-border-dark rounded-xl text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:text-white transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ----------------- MATH CAPTCHA SECTION ----------------- */}
              {requireCaptcha && (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-border-light dark:border-border-dark space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-red flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Math CAPTCHA Required
                    </span>
                    <button
                      type="button"
                      onClick={handleRefreshCaptcha}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition p-1"
                      title="Load fresh CAPTCHA challenge"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-zinc-800 px-4 py-2 border border-border-light dark:border-border-dark rounded-xl text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300">
                      {captchaEquation}
                    </div>
                    <input
                      type="number"
                      placeholder="Answer"
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      className="flex-grow px-3 py-2 bg-transparent border border-border-light dark:border-border-dark rounded-xl text-sm font-semibold outline-none focus:border-brand-purple dark:text-white"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Solve this equation to unlock sign-in. This rate-limit prevents credential scraping bots.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loadingState}
                className="w-full mt-6 py-2.5 bg-brand-purple hover:bg-brand-purple/90 disabled:bg-brand-purple/50 text-white rounded-xl text-sm font-medium transition cursor-pointer select-none card-shadow flex items-center justify-center gap-2"
              >
                {loadingState ? loadingMessage : 'Sign In securely'}
              </button>
            </form>

            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-border-light dark:border-border-dark"></div>
              <span className="flex-shrink mx-4 text-zinc-400 text-xs uppercase tracking-wider font-semibold">Or</span>
              <div className="flex-grow border-t border-border-light dark:border-border-dark"></div>
            </div>

            {/* Google Sign In Button Anchor */}
            <div className="w-full flex justify-center py-1">
              <div id="googleSignInBtn"></div>
            </div>

            <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark text-center">
              <p className="text-xs text-color-text-muted-light dark:text-color-text-muted-dark">
                Don't have an account yet?
                <button
                  onClick={() => {
                    setView('signup');
                    setFormError('');
                    setSuccessMessage('');
                  }}
                  className="ml-1.5 text-brand-purple hover:underline font-semibold cursor-pointer"
                >
                  Create an Account
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ----------------- 2. SIGNUP VIEW ----------------- */}
        {view === 'signup' && (
          <div>
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple mb-3">
                <User className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-display font-semibold tracking-tight text-color-text-light dark:text-color-text-dark m-0">
                Register Account
              </h1>
              <p className="text-sm text-color-text-muted-light dark:text-color-text-muted-dark mt-1.5">
                Join DisciplineX and start tracking consistency.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-color-text-muted-light dark:text-color-text-muted-dark">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-border-light dark:border-border-dark rounded-xl text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:text-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-color-text-muted-light dark:text-color-text-muted-dark">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-border-light dark:border-border-dark rounded-xl text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:text-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark mb-1.5">
                  Secure Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-color-text-muted-light dark:text-color-text-muted-dark">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-transparent border border-border-light dark:border-border-dark rounded-xl text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:text-white transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Real-time Password Strength Meter */}
                {password.length > 0 && (
                  <div className="mt-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-400">
                      <span>Password Strength:</span>
                      <span className={
                        passwordStrength === 1 ? 'text-brand-red' :
                        passwordStrength === 2 ? 'text-brand-amber' :
                        passwordStrength === 3 ? 'text-brand-green' : 'text-zinc-400'
                      }>
                        {passwordStrength === 1 && 'Weak (At least 8 characters)'}
                        {passwordStrength === 2 && 'Medium (Add numbers/symbols)'}
                        {passwordStrength === 3 && 'Strong & Cryptographically Safe'}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex gap-0.5">
                      <div className={`h-full flex-grow transition-all duration-300 ${
                        passwordStrength >= 1 ? (passwordStrength === 1 ? 'bg-brand-red' : passwordStrength === 2 ? 'bg-brand-amber' : 'bg-brand-green') : 'bg-transparent'
                      }`} />
                      <div className={`h-full flex-grow transition-all duration-300 ${
                        passwordStrength >= 2 ? (passwordStrength === 2 ? 'bg-brand-amber' : 'bg-brand-green') : 'bg-transparent'
                      }`} />
                      <div className={`h-full flex-grow transition-all duration-300 ${
                        passwordStrength >= 3 ? 'bg-brand-green' : 'bg-transparent'
                      }`} />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loadingState}
                className="w-full mt-6 py-2.5 bg-brand-purple hover:bg-brand-purple/90 disabled:bg-brand-purple/50 text-white rounded-xl text-sm font-semibold transition cursor-pointer select-none card-shadow flex items-center justify-center gap-2"
              >
                {loadingState ? loadingMessage : 'Create Account'}
              </button>
            </form>

            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-border-light dark:border-border-dark"></div>
              <span className="flex-shrink mx-4 text-zinc-400 text-xs uppercase tracking-wider font-semibold">Or</span>
              <div className="flex-grow border-t border-border-light dark:border-border-dark"></div>
            </div>

            {/* Google Sign In Button Anchor */}
            <div className="w-full flex justify-center py-1">
              <div id="googleSignInBtn"></div>
            </div>

            <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark text-center">
              <p className="text-xs text-color-text-muted-light dark:text-color-text-muted-dark">
                Already have an account?
                <button
                  onClick={() => {
                    setView('login');
                    setFormError('');
                    setSuccessMessage('');
                  }}
                  className="ml-1.5 text-brand-purple hover:underline font-semibold cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ----------------- EMAIL OTP CODE VERIFICATION VIEW ----------------- */}
        {view === 'verify-email-code' && (
          <div>
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple mb-3 animate-pulse">
                <Shield className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-display font-semibold tracking-tight text-color-text-light dark:text-color-text-dark m-0">
                Verify Your Email
              </h1>
              <p className="text-xs text-color-text-muted-light dark:text-color-text-muted-dark mt-2 leading-relaxed">
                We have dispatched a 6-digit verification code to <span className="font-semibold text-brand-purple break-all">{verificationEmail}</span>. Enter it below to launch your workspace.
              </p>
            </div>

            <form onSubmit={handleEmailCodeVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark mb-2 text-center">
                  6-Digit Verification Code
                </label>
                <div className="relative flex justify-center">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-color-text-muted-light dark:text-color-text-muted-dark">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Enter Code (e.g. 123456)"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                    className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-border-light dark:border-border-dark rounded-xl text-center font-mono tracking-[0.5em] text-lg outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:text-white transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingState}
                className="w-full mt-2 py-2.5 bg-brand-purple hover:bg-brand-purple/90 disabled:bg-brand-purple/50 text-white rounded-xl text-sm font-semibold transition cursor-pointer select-none card-shadow flex items-center justify-center gap-2"
              >
                {loadingState ? loadingMessage : 'Verify & Launch Workspace'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark text-center">
              <p className="text-xs text-color-text-muted-light dark:text-color-text-muted-dark">
                Wait! Misspelled your email or want to try again?
                <button
                  onClick={() => {
                    setView('signup');
                    setFormError('');
                    setSuccessMessage('');
                  }}
                  className="ml-1.5 text-brand-purple hover:underline font-semibold cursor-pointer"
                >
                  Register again
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ----------------- 3. TWO-FACTOR OTP VIEW ----------------- */}
        {view === '2fa' && (
          <div>
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-display font-semibold tracking-tight text-color-text-light dark:text-color-text-dark m-0">
                Identity Verification
              </h1>
              <p className="text-xs text-color-text-muted-light dark:text-color-text-muted-dark mt-2 leading-relaxed">
                {twoFaMethod === 'email' 
                  ? 'A 6-digit verification code has been dispatched to your email. Check your simulated mailbox console below.' 
                  : 'Please retrieve the 6-digit authentication token from your TOTP Authenticator app.'}
              </p>
            </div>

            <form onSubmit={handle2FAVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark mb-1.5 text-center">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full tracking-[0.5em] text-center font-mono font-bold text-xl py-3 bg-transparent border border-border-light dark:border-border-dark rounded-xl outline-none focus:border-brand-purple dark:text-white"
                  required
                />
              </div>

              {/* Trusted Device Checkbox */}
              <div className="flex items-center gap-2.5 py-2">
                <input
                  type="checkbox"
                  id="trusted"
                  checked={trustedDevice}
                  onChange={(e) => setTrustedDevice(e.target.checked)}
                  className="w-4 h-4 accent-brand-purple rounded border-zinc-300 cursor-pointer"
                />
                <label htmlFor="trusted" className="text-xs font-semibold text-color-text-muted-light dark:text-color-text-muted-dark cursor-pointer select-none">
                  Remember this device for 30 days
                </label>
              </div>

              <button
                type="submit"
                disabled={loadingState}
                className="w-full mt-2 py-2.5 bg-brand-purple hover:bg-brand-purple/90 disabled:bg-brand-purple/50 text-white rounded-xl text-sm font-semibold transition cursor-pointer select-none card-shadow"
              >
                {loadingState ? loadingMessage : 'Verify & Launch Workspace'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark text-center">
              <button
                onClick={() => {
                  setView('login');
                  setFormError('');
                  setSuccessMessage('');
                }}
                className="text-xs text-zinc-400 hover:text-brand-purple font-semibold flex items-center justify-center gap-1 mx-auto"
              >
                <ChevronLeft className="w-4 h-4" /> Go back to credentials sign-in
              </button>
            </div>
          </div>
        )}

        {/* ----------------- 4. FORGOT PASSWORD VIEW ----------------- */}
        {view === 'forgot-password' && (
          <div>
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-brand-amber/10 dark:bg-brand-amber/20 flex items-center justify-center text-brand-amber mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-display font-semibold tracking-tight text-color-text-light dark:text-color-text-dark m-0">
                Reset Credentials
              </h1>
              <p className="text-xs text-color-text-muted-light dark:text-color-text-muted-dark mt-2 leading-relaxed">
                Provide your registered email address below. If an account matches, a 6-digit reset OTP code will be dispatched.
              </p>
            </div>

            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-color-text-muted-light dark:text-color-text-muted-dark">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-border-light dark:border-border-dark rounded-xl text-sm outline-none focus:border-brand-purple dark:text-white transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingState}
                className="w-full mt-4 py-2.5 bg-brand-purple hover:bg-brand-purple/90 disabled:bg-brand-purple/50 text-white rounded-xl text-sm font-semibold transition cursor-pointer select-none card-shadow"
              >
                {loadingState ? loadingMessage : 'Request Reset Code'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark text-center">
              <button
                onClick={() => {
                  setView('login');
                  setFormError('');
                  setSuccessMessage('');
                }}
                className="text-xs text-zinc-400 hover:text-brand-purple font-semibold flex items-center justify-center gap-1 mx-auto"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ----------------- 5. RESET PASSWORD VIEW ----------------- */}
        {view === 'reset-password' && (
          <div>
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-display font-semibold tracking-tight text-color-text-light dark:text-color-text-dark m-0">
                Establish Credentials
              </h1>
              <p className="text-xs text-color-text-muted-light dark:text-color-text-muted-dark mt-2 leading-relaxed">
                Check your terminal/console logs for the simulated password reset token, and establish your new secure password below.
              </p>
            </div>

            <form onSubmit={handleExecuteReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark mb-1.5 text-center">
                  Verification Code (OTP)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full tracking-[0.5em] text-center font-mono font-bold text-xl py-2.5 bg-transparent border border-border-light dark:border-border-dark rounded-xl outline-none focus:border-brand-purple dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark mb-1.5">
                  New Secure Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-color-text-muted-light dark:text-color-text-muted-dark">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-transparent border border-border-light dark:border-border-dark rounded-xl text-sm outline-none focus:border-brand-purple dark:text-white transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Reset Password strength meter */}
                {newPassword.length > 0 && (
                  <div className="mt-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-400">
                      <span>Password Strength:</span>
                      <span className={
                        resetPasswordStrength === 1 ? 'text-brand-red' :
                        resetPasswordStrength === 2 ? 'text-brand-amber' :
                        resetPasswordStrength === 3 ? 'text-brand-green' : 'text-zinc-400'
                      }>
                        {resetPasswordStrength === 1 && 'Weak (At least 8 characters)'}
                        {resetPasswordStrength === 2 && 'Medium (Add numbers/symbols)'}
                        {resetPasswordStrength === 3 && 'Strong & Cryptographically Safe'}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex gap-0.5">
                      <div className={`h-full flex-grow transition-all duration-300 ${
                        resetPasswordStrength >= 1 ? (resetPasswordStrength === 1 ? 'bg-brand-red' : resetPasswordStrength === 2 ? 'bg-brand-amber' : 'bg-brand-green') : 'bg-transparent'
                      }`} />
                      <div className={`h-full flex-grow transition-all duration-300 ${
                        resetPasswordStrength >= 2 ? (resetPasswordStrength === 2 ? 'bg-brand-amber' : 'bg-brand-green') : 'bg-transparent'
                      }`} />
                      <div className={`h-full flex-grow transition-all duration-300 ${
                        resetPasswordStrength >= 3 ? 'bg-brand-green' : 'bg-transparent'
                      }`} />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loadingState}
                className="w-full mt-4 py-2.5 bg-brand-purple hover:bg-brand-purple/90 disabled:bg-brand-purple/50 text-white rounded-xl text-sm font-semibold transition cursor-pointer select-none card-shadow"
              >
                {loadingState ? loadingMessage : 'Save & Sign In'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark text-center">
              <button
                onClick={() => {
                  setView('login');
                  setFormError('');
                  setSuccessMessage('');
                }}
                className="text-xs text-zinc-400 hover:text-brand-purple font-semibold flex items-center justify-center gap-1 mx-auto"
              >
                <ChevronLeft className="w-4 h-4" /> Cancel and go back to Sign In
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Global CSS laser scanning effect style */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes laser {
          0%, 100% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { top: 100%; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out 3;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
      `}} />
    </div>
  );
};

export default Login;
