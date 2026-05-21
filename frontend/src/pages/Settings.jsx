import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  User, 
  Moon, 
  Sun, 
  Trash2, 
  Download, 
  Target, 
  Check, 
  AlertTriangle,
  LogOut,
  Shield,
  Fingerprint,
  Smartphone,
  Laptop,
  Monitor,
  Key,
  QrCode,
  Info,
  CheckCircle2,
  Lock
} from 'lucide-react';

export const Settings = () => {
  const { 
    user, 
    updateUserProfile, 
    logout,
    isDark,
    toggleTheme
  } = useAuth();
  
  // Profile Form states
  const [name, setName] = useState(user ? user.name : '');
  const [dailyGoal, setDailyGoal] = useState(user ? user.dailyGoal : 4);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Danger Zone
  const [showDangerZone, setShowDangerZone] = useState(false);

  // Theme state is now managed globally by AuthContext

  // Security Console States
  const [sessions, setSessions] = useState([]);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [securityError, setSecurityError] = useState('');
  
  // 2FA Setup state
  const [twoFaSetupStep, setTwoFaSetupStep] = useState('idle'); // idle, pending_confirmation
  const [pending2FaMethod, setPending2FaMethod] = useState('none');
  const [twoFaSecret, setTwoFaSecret] = useState('');
  const [twoFaQrData, setTwoFaQrData] = useState('');
  const [twoFaQrCodeUrl, setTwoFaQrCodeUrl] = useState('');
  const [twoFaConfirmCode, setTwoFaConfirmCode] = useState('');

  // Biometrics removed as per straightforward UX guidelines

  // toggleTheme is now managed globally by AuthContext

  // Fetch active sessions
  const fetchSessions = async () => {
    try {
      const data = await api.get('/auth/sessions');
      setSessions(data);
    } catch (err) {
      console.error('[Settings] Sessions fetch error:', err.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setProfileLoading(true);

    try {
      await updateUserProfile(name, dailyGoal);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // 2FA Actions
  const handleInitiate2FA = async (method) => {
    setSecurityError('');
    setSecuritySuccess('');
    setSecurityLoading(true);

    try {
      const data = await api.post('/auth/setup-2fa', { method });
      if (data.tempSetup) {
        setTwoFaSetupStep('pending_confirmation');
        setPending2FaMethod(method);
        if (method === 'totp') {
          setTwoFaSecret(data.secret);
          setTwoFaQrData(data.qrData);
          setTwoFaQrCodeUrl(data.qrCodeDataUrl || '');
        }
        setSecuritySuccess(data.message);
      } else {
        setSecuritySuccess(data.message);
        setTwoFaSetupStep('idle');
        // Refresh local user state via page reload or refresh API
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      setSecurityError(err.message || 'Failed to configure 2FA.');
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleConfirm2FA = async (e) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');
    
    if (!twoFaConfirmCode) {
      setSecurityError('Please enter the verification code.');
      return;
    }

    setSecurityLoading(true);
    try {
      const data = await api.post('/auth/confirm-2fa', { 
        code: twoFaConfirmCode, 
        method: pending2FaMethod 
      });
      setSecuritySuccess(data.message);
      setTwoFaSetupStep('idle');
      setTwoFaConfirmCode('');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setSecurityError(err.message || 'Verification failed. Code is invalid or has expired.');
    } finally {
      setSecurityLoading(false);
    }
  };

  // Biometrics registration removed as per straightforward UX guidelines

  // Revoke individual session
  const handleRevokeSession = async (sessionId) => {
    setSecurityError('');
    setSecuritySuccess('');
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      setSecuritySuccess('Active session revoked successfully.');
      fetchSessions();
      setTimeout(() => setSecuritySuccess(''), 3000);
    } catch (err) {
      setSecurityError(err.message || 'Failed to revoke session.');
    }
  };

  const handleExportData = async () => {
    try {
      const allTasks = await api.get(`/schedule?date=${new Date().toISOString().split('T')[0]}`);
      const analytics = await api.get('/analytics/summary');
      
      const exportObject = {
        app: 'DisciplineX Backup',
        user: {
          name: user.name,
          email: user.email,
          dailyGoal: user.dailyGoal
        },
        stats: {
          currentStreak: analytics.currentStreak,
          longestStreak: analytics.longestStreak,
          totalCompletedHours: analytics.totalCompletedHours
        },
        exportedAt: new Date().toISOString(),
        tasks: allTasks
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `disciplinex_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Failed to export data: ' + err.message);
    }
  };

  const handleResetData = async () => {
    if (!confirm('CRITICAL WARNING: This will permanently erase ALL your routine task history and reset all streaks. This action CANNOT be undone. Are you absolutely certain you want to proceed?')) {
      return;
    }
    
    try {
      await api.post('/schedule/clear');
      alert('All schedule history has been completely wiped.');
      window.location.reload();
    } catch (err) {
      alert('Failed to wipe data: ' + err.message);
    }
  };

  // Get active session icon
  const getSessionIcon = (deviceName) => {
    if (deviceName.includes('Mobile')) {
      return <Smartphone className="w-5 h-5 text-zinc-500" />;
    }
    if (deviceName.includes('Windows') || deviceName.includes('PC')) {
      return <Laptop className="w-5 h-5 text-zinc-500" />;
    }
    return <Monitor className="w-5 h-5 text-zinc-500" />;
  };

  // Format session date
  const formatSessionDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Grid Mock QR Code Generator for TOTP Enable Flow
  const MockQRCode = () => {
    return (
      <div className="relative w-36 h-36 bg-white border-4 border-zinc-150 p-2 rounded-2xl flex flex-wrap gap-0.5 justify-center items-center shadow-inner select-none overflow-hidden mx-auto">
        {/* Neon scan sweep line */}
        <div 
          className="absolute left-0 right-0 h-0.5 bg-brand-purple/70 shadow-[0_0_6px_#8a3ffc]" 
          style={{
            animation: 'sweep 3s infinite ease-in-out',
            top: '4px'
          }}
        />
        
        {/* Corner QR anchors */}
        <div className="absolute top-2 left-2 w-8 h-8 border-[4px] border-zinc-950 bg-white flex items-center justify-center rounded-sm">
          <div className="w-3.5 h-3.5 bg-zinc-950 rounded-[1px]" />
        </div>
        <div className="absolute top-2 right-2 w-8 h-8 border-[4px] border-zinc-950 bg-white flex items-center justify-center rounded-sm">
          <div className="w-3.5 h-3.5 bg-zinc-950 rounded-[1px]" />
        </div>
        <div className="absolute bottom-2 left-2 w-8 h-8 border-[4px] border-zinc-950 bg-white flex items-center justify-center rounded-sm">
          <div className="w-3.5 h-3.5 bg-zinc-950 rounded-[1px]" />
        </div>
        
        {/* Fake random QR matrix grid blocks */}
        <div className="grid grid-cols-12 gap-[3px] w-full h-full opacity-80 pt-8 pl-8 pr-8 pb-8">
          {Array.from({ length: 64 }).map((_, i) => (
            <div 
              key={i} 
              className={`w-[5px] h-[5px] rounded-[1px] ${
                (i * 3 + 7) % 5 === 0 || (i * 7 + 13) % 4 === 0 
                  ? 'bg-zinc-950' 
                  : 'bg-transparent'
              }`} 
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 font-sans">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-900 dark:text-white m-0">
          Preferences & Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Adjust your daily goals, interface styles, and routine archives.
        </p>
      </div>

      <div className="space-y-6">
        
        {/* 1. Profile Settings Card */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-brand-purple" />
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 m-0">
              Profile Configurations
            </h3>
          </div>

          {profileSuccess && (
            <div className="mb-4 p-3 bg-brand-green/5 border border-brand-green/20 text-brand-green text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" />
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="mb-4 p-3 bg-brand-red/5 border border-brand-red/20 text-brand-red text-xs font-semibold rounded-xl text-center">
              {profileError}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark mb-1.5">
                Display Name
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-border-light dark:border-border-dark rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple text-zinc-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark mb-1.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-zinc-400" />
                Daily Focus Target (Hours)
              </label>
              <input 
                type="number" 
                min="1"
                max="24"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-border-light dark:border-border-dark rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple text-zinc-900 dark:text-white"
                required
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                Your daily score indicator and streaks are measured against this hourly/task routine target.
              </p>
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="px-5 py-2.5 bg-brand-purple hover:bg-brand-purple/90 disabled:bg-brand-purple/50 text-white rounded-xl text-xs font-semibold transition cursor-pointer select-none card-shadow"
            >
              {profileLoading ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </form>
        </div>

        {/* 2. DISCIPLINEX ENTERPRISE SECURITY CENTER */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow space-y-8">
          
          {/* Header Title */}
          <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-4">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5.5 h-5.5 text-brand-purple" />
              <div>
                <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 m-0">
                  Security & Authentication Console
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Secure your discipline archive with cryptographic protection tools.
                </p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-2.5 h-2.5 text-brand-purple" /> SHA-256 Vault
            </span>
          </div>

          {/* Success / Error alerts */}
          {securitySuccess && (
            <div className="p-3 bg-brand-green/5 border border-brand-green/20 text-brand-green text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4" />
              {securitySuccess}
            </div>
          )}
          {securityError && (
            <div className="p-3 bg-brand-red/5 border border-brand-red/20 text-brand-red text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              {securityError}
            </div>
          )}

          {/* SECTION A: TWO-FACTOR AUTHENTICATION */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark flex items-center gap-1.5">
              <Key className="w-4 h-4 text-brand-purple" /> Two-Factor Authentication (2FA)
            </h4>

            {twoFaSetupStep === 'idle' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-border-light dark:border-border-dark">
                  <div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Current Status:
                    </span>
                    <span className={`ml-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                      user?.twoFactorEnabled 
                        ? 'bg-brand-green/10 text-brand-green border border-brand-green/25' 
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                    }`}>
                      {user?.twoFactorEnabled ? `Enabled (${user.twoFactorMethod === 'totp' ? 'Authenticator App' : 'Email OTP'})` : 'Disabled'}
                    </span>
                  </div>

                  {user?.twoFactorEnabled && (
                    <button
                      onClick={() => handleInitiate2FA('none')}
                      disabled={securityLoading}
                      className="px-3 py-1.5 bg-brand-red/10 hover:bg-brand-red hover:text-white border border-brand-red/20 text-brand-red rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      Disable 2FA
                    </button>
                  )}
                </div>

                {!user?.twoFactorEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => handleInitiate2FA('email')}
                      disabled={securityLoading}
                      className="p-4 border border-border-light dark:border-border-dark hover:border-brand-purple rounded-xl text-left bg-zinc-50/20 dark:bg-zinc-800/10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition cursor-pointer select-none"
                    >
                      <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 m-0">
                        Enable Email OTP Verification
                      </h5>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                        Receive a secure 6-digit one-time code to your inbox during sign-in verification steps.
                      </p>
                    </button>

                    <button
                      onClick={() => handleInitiate2FA('totp')}
                      disabled={securityLoading}
                      className="p-4 border border-border-light dark:border-border-dark hover:border-brand-purple rounded-xl text-left bg-zinc-50/20 dark:bg-zinc-800/10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition cursor-pointer select-none"
                    >
                      <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 m-0">
                        Enable Authenticator App (TOTP)
                      </h5>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                        Scan a QR code with Google Authenticator, Authy, or 1Password for highly-secure time-based OTP codes.
                      </p>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* PENDING CONFIRMATION SLIDE IN */
              <div className="p-5 border border-brand-purple/20 bg-brand-purple/5 rounded-2xl space-y-5 animate-slideIn">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-brand-purple" />
                  <span className="text-xs font-bold text-brand-purple uppercase tracking-wider">
                    Confirming 2FA Configuration Setup
                  </span>
                </div>

                {pending2FaMethod === 'totp' && (
                  <div className="space-y-4">
                    {/* Visual QR Code rendering */}
                    {twoFaQrCodeUrl ? (
                      <div className="relative w-36 h-36 bg-white p-2 rounded-2xl flex items-center justify-center border border-border-light dark:border-border-dark shadow-inner select-none mx-auto overflow-hidden">
                        <img src={twoFaQrCodeUrl} alt="Authenticator App QR Code" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <MockQRCode />
                    )}

                    <div className="space-y-2 bg-white dark:bg-zinc-900 border border-border-light dark:border-border-dark p-4 rounded-xl">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold mb-1">
                        <Info className="w-4 h-4 flex-shrink-0" /> Cannot scan QR? Enter secret key:
                      </div>
                      <code className="block tracking-widest text-center font-mono font-bold text-sm bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border text-zinc-800 dark:text-zinc-200">
                        {twoFaSecret}
                      </code>
                    </div>
                  </div>
                )}

                <form onSubmit={handleConfirm2FA} className="space-y-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Verify Code from OTP Dispatch:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={twoFaConfirmCode}
                      onChange={(e) => setTwoFaConfirmCode(e.target.value.replace(/\D/g, ''))}
                      className="flex-grow font-mono font-bold text-center tracking-[0.2em] py-2 border border-border-light dark:border-border-dark rounded-xl bg-transparent outline-none focus:border-brand-purple dark:text-white text-sm"
                      required
                    />
                    <button
                      type="submit"
                      disabled={securityLoading}
                      className="px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl text-xs font-bold transition select-none card-shadow"
                    >
                      {securityLoading ? 'Verifying...' : 'Activate 2FA'}
                    </button>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setTwoFaSetupStep('idle');
                      setSecurityError('');
                      setSecuritySuccess('');
                    }}
                    className="text-[10px] text-zinc-400 hover:text-brand-purple font-semibold hover:underline block"
                  >
                    Cancel and discard setup
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Section B (Biometrics) removed for straightforward UX */}

          {/* SECTION C: ACTIVE USER SESSIONS */}
          <div className="space-y-4 pt-4 border-t border-border-light dark:border-border-dark">
            <h4 className="text-xs font-bold uppercase tracking-wider text-color-text-muted-light dark:text-color-text-muted-dark flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-brand-purple" /> Active Authorized Sessions
            </h4>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {sessions.map((s) => (
                <div 
                  key={s._id} 
                  className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/20 rounded-xl border border-border-light dark:border-border-dark hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                      {getSessionIcon(s.deviceName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                          {s.deviceName}
                        </span>
                        {s.isCurrent && (
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-green/10 text-brand-green border border-brand-green/20">
                            Current device
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-400 mt-0.5 font-mono">
                        IP: {s.ip} • Last active: {s.isCurrent ? 'Active now' : formatSessionDate(s.lastActive)}
                      </p>
                    </div>
                  </div>

                  {!s.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(s._id)}
                      className="p-2 border border-border-light dark:border-border-dark text-zinc-400 hover:text-brand-red hover:bg-brand-red/5 rounded-lg transition cursor-pointer"
                      title="Revoke session authority and sign out"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {sessions.length === 0 && (
                <p className="text-center text-xs text-zinc-400 py-4">
                  No active authorized session records found.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* 3. Theme Support Settings Card */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDark ? <Moon className="w-5 h-5 text-brand-amber" /> : <Sun className="w-5 h-5 text-brand-amber" />}
              <div>
                <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 m-0">
                  Visual Interface Theme
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Toggle between Light Mode or Dark Mode.
                </p>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 border border-border-light dark:border-border-dark hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold transition cursor-pointer select-none"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-brand-amber" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-zinc-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4. Data Tools / Backup */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 m-0 flex items-center gap-2">
                <Download className="w-5 h-5 text-zinc-400" />
                Routine Data Export
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Download a complete secure JSON backup file of all scheduled routines and streaks.
              </p>
            </div>

            <button
              onClick={handleExportData}
              className="flex items-center gap-2 px-4 py-2 border border-border-light dark:border-border-dark hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold transition cursor-pointer select-none"
            >
              <Download className="w-4 h-4" />
              Export JSON Backup
            </button>
          </div>
        </div>

        {/* 5. Danger Zone */}
        <div className="bg-white dark:bg-bg-card-dark border border-brand-red/20 dark:border-brand-red/35 p-6 rounded-2xl card-shadow bg-brand-red/5 dark:bg-brand-red/5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-brand-red m-0 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </h3>
              <p className="text-xs text-brand-red/80 mt-1 max-w-md">
                Wiping your account is a critical action. It will permanently clear your scheduled tasks, past tracking logs, and active streaks.
              </p>
            </div>

            <button
              onClick={() => setShowDangerZone(!showDangerZone)}
              className="px-4 py-2 bg-brand-red/10 border border-brand-red/20 hover:bg-brand-red hover:text-white text-brand-red rounded-xl text-xs font-semibold transition cursor-pointer select-none"
            >
              Reveal Actions
            </button>
          </div>

          {showDangerZone && (
            <div className="mt-6 pt-5 border-t border-brand-red/15 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <span className="text-xs text-brand-red/90 font-medium">
                Wipe all records, logs, routines, and streaks completely:
              </span>
              <button
                onClick={handleResetData}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-red text-white hover:bg-brand-red/90 rounded-xl text-xs font-semibold cursor-pointer transition select-none card-shadow"
              >
                <Trash2 className="w-4 h-4" />
                Reset Discipline History
              </button>
            </div>
          )}
        </div>

        {/* 6. Log Out */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-5 py-2.5 border border-border-light dark:border-border-dark hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold rounded-xl transition cursor-pointer select-none"
          >
            <LogOut className="w-4 h-4" />
            Sign Out of Account
          </button>
        </div>

      </div>

      {/* Global settings custom CSS animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes sweep {
          0%, 100% { top: 4px; }
          50% { top: calc(100% - 6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: scale(0.98) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-slideIn {
          animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
};

export default Settings;
