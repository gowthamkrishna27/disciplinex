import nodemailer from 'nodemailer';
import dns from 'dns';

let testAccount = null;

const getTransporter = async () => {
  // If Resend API Key is provided, use the lightweight mock transporter (intercepted in sendMailWithRetry)
  if (process.env.RESEND_API_KEY) {
    return {
      options: { host: 'resend.api' },
      sendMail: async () => ({ messageId: 'resend-mock-id' })
    };
  }

  // If custom SMTP settings are provided in env, use them
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT) || 587;
    // Auto-enable SSL/TLS if port is 465 or SMTP_SECURE is explicitly true
    const secure = port === 465 || process.env.SMTP_SECURE === 'true';

    let resolvedHost = process.env.SMTP_HOST;
    const tlsConfig = {};

    // For cloud environments (like Railway) experiencing IPv6 ENETUNREACH issues,
    // we pre-resolve the hostname to a pure IPv4 address using dns.resolve4.
    try {
      const isIp = /^[0-9.]+$/.test(resolvedHost) || resolvedHost.includes(':');
      if (!isIp) {
        console.log(`[Email Service] Pre-resolving SMTP host ${resolvedHost} to IPv4...`);
        const addresses = await dns.promises.resolve4(resolvedHost);
        if (addresses && addresses.length > 0) {
          resolvedHost = addresses[0];
          tlsConfig.servername = process.env.SMTP_HOST;
          console.log(`[Email Service] Successfully pre-resolved to IPv4 address: ${resolvedHost}`);
        }
      }
    } catch (dnsErr) {
      console.warn(`[Email Service] DNS IPv4 pre-resolution failed, falling back to hostname:`, dnsErr.message);
    }

    return nodemailer.createTransport({
      host: resolvedHost,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: tlsConfig,
      connectionTimeout: 5000, // 5 seconds
      socketTimeout: 5000,     // 5 seconds
    });


  }

  // Fallback: Programmatic Ethereal Mail Account for zero-config developer testing
  if (!testAccount) {
    try {
      console.log('[Email Service] Creating Ethereal Test Mail Account for developers...');
      testAccount = await nodemailer.createTestAccount();
    } catch (err) {
      console.error('[Email Service] Failed to create Ethereal test account:', err.message);
    }
  }

  if (testAccount) {
    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      connectionTimeout: 5000, // 5 seconds
      socketTimeout: 5000,     // 5 seconds
    });
  }

  return null;
};

// Retry-safe helper function to send email
const sendMailWithRetry = async (transporter, mailOptions, retries = 2) => {
  // If Resend API key is configured, use the HTTPS API directly (bypasses Railway SMTP port blocks)
  if (process.env.RESEND_API_KEY) {
    const fromEmail = process.env.RESEND_FROM || 'onboarding@resend.dev';
    const fromName = mailOptions.from ? mailOptions.from.split('<')[0].trim().replace(/"/g, '') : 'DisciplineX';
    
    console.log(`[Email Service] RESEND_API_KEY detected. Dispatching email to ${mailOptions.to} via HTTPS API...`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: mailOptions.to,
            subject: mailOptions.subject,
            html: mailOptions.html
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[Email Service] Email sent successfully via Resend HTTPS. ID: ${data.id}`);
          return { success: true, info: { messageId: data.id } };
        } else {
          const errorText = await response.text();
          throw new Error(`Resend HTTP ${response.status}: ${errorText}`);
        }
      } catch (err) {
        console.warn(`[Email Service] Resend attempt ${attempt} failed: ${err.message}`);
        if (attempt === retries) {
          throw err;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Fallback to standard Nodemailer transporter
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return { success: true, info };
    } catch (err) {
      console.warn(`[Email Service] Attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) {
        throw err; // Rethrow on the last attempt
      }
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

// Common HTML Wrapper for premium dark aesthetics
const getHtmlWrapper = (title, content, preheaderText = '') => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            background-color: #0b0f19;
            color: #cbd5e1;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #111827;
            border: 1px solid #1f2937;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
          }
          .header {
            padding: 32px 40px;
            background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
            border-bottom: 1px solid #1f2937;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.025em;
            color: #ffffff;
            margin: 0;
            display: inline-block;
          }
          .logo span {
            color: #a855f7;
          }
          .content {
            padding: 40px;
            font-size: 15px;
            line-height: 1.6;
            color: #cbd5e1;
          }
          .title {
            font-size: 22px;
            font-weight: 700;
            color: #ffffff;
            margin-top: 0;
            margin-bottom: 20px;
          }
          .btn-container {
            margin: 32px 0;
            text-align: center;
          }
          .btn {
            display: inline-block;
            background-color: #7c3aed;
            color: #ffffff !important;
            padding: 14px 36px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            transition: background-color 0.2s;
            box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.3);
          }
          .btn:hover {
            background-color: #6d28d9;
          }
          .otp-box {
            background-color: #1e293b;
            border: 1px dashed #6d28d9;
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            font-family: monospace;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: 12px;
            color: #a855f7;
            margin: 28px 0;
            box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.2);
          }
          .footer {
            padding: 32px 40px;
            background-color: #0f172a;
            border-top: 1px solid #1f2937;
            font-size: 12px;
            color: #64748b;
            text-align: center;
            line-height: 1.5;
          }
          .footer a {
            color: #a855f7;
            text-decoration: none;
          }
          .footer a:hover {
            text-decoration: underline;
          }
          .notice-box {
            background-color: #1e293b;
            border-left: 4px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
            font-size: 13px;
            color: #94a3b8;
          }
          .alert-box {
            background-color: #1e293b;
            border-left: 4px solid #ef4444;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
            font-size: 13px;
            color: #cbd5e1;
          }
          .device-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .device-table td {
            padding: 10px 0;
            border-bottom: 1px solid #1f2937;
            font-size: 13px;
          }
          .device-table td.label {
            color: #64748b;
            width: 35%;
            font-weight: 600;
          }
          .device-table td.value {
            color: #cbd5e1;
            font-weight: 500;
          }
          p {
            margin-top: 0;
            margin-bottom: 16px;
          }
          strong {
            color: #ffffff;
          }
        </style>
      </head>
      <body>
        ${preheaderText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${preheaderText}</div>` : ''}
        <div class="container">
          <div class="header">
            <div class="logo">Discipline<span>X</span></div>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>Consistency over intensity.</p>
            <p>This is an automated message sent from the secure DisciplineX authentication service.</p>
            <p>© ${new Date().getFullYear()} DisciplineX. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const sendVerificationEmail = async (toEmail, verifyUrl) => {
  try {
    const transporter = await getTransporter();

    const title = 'Verify Your Email Address — DisciplineX';
    const preheader = 'Complete your DisciplineX registration inside 5 minutes.';
    const content = `
      <h2 class="title">Verify Your Email Address</h2>
      <p>Thank you for creating an account with DisciplineX. To start tracking your habits, routines, and scheduling your productivity milestones, please verify your email address by clicking the secure button below:</p>
      <div class="btn-container">
        <a href="${verifyUrl}" class="btn" target="_blank">Verify Email Address</a>
      </div>
      <div class="notice-box">
        <strong>Verification Window:</strong> This link is only secure and active for <strong>5 minutes</strong>. If you do not verify your email within 5 minutes, your unverified registration details will be automatically purged for database hygiene, and you will need to register again.
      </div>
      <p>If the button doesn't work, copy and paste this link into your browser's address bar:</p>
      <p style="word-break: break-all; font-size: 12px; color: #a855f7;">${verifyUrl}</p>
    `;

    const mailOptions = {
      from: '"DisciplineX" <noreply@disciplinex-tau.vercel.app>',
      to: toEmail,
      subject: title,
      html: getHtmlWrapper(title, content, preheader)
    };

    if (transporter) {
      const { info } = await sendMailWithRetry(transporter, mailOptions);
      console.log(`[Email Service] Verification email sent successfully to: ${toEmail}`);
      
      // If programmatically generated ethereal mail, log the direct view URL
      if (testAccount && transporter.options.host.includes('ethereal.email')) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`\n======================================================================`);
        console.log(`[ETHEREAL MAILBOX] View sent verification email: ${previewUrl}`);
        console.log(`======================================================================\n`);
        return { success: true, previewUrl };
      }
      return { success: true };
    }
  } catch (err) {
    console.error('[Email Service] Failed to send verification email after retries:', err.message);
  }
  return { success: false };
};

export const sendOtpEmail = async (toEmail, otpCode) => {
  try {
    const transporter = await getTransporter();

    const title = 'Your 2FA Verification Code — DisciplineX';
    const preheader = 'Use this One-Time Passcode to authorize your sign-in attempt.';
    const content = `
      <h2 class="title">Two-Factor Authentication (2FA) Code</h2>
      <p>A sign-in attempt was detected for your DisciplineX account that requires multi-factor approval.</p>
      <p>Please enter the following 6-digit One-Time Passcode (OTP) on the verification screen to complete your login:</p>
      <div class="otp-box">${otpCode}</div>
      <div class="notice-box">
        <strong>Security Warning:</strong> This OTP is highly sensitive and will expire in <strong>15 minutes</strong>. Never share this code with anyone.
      </div>
      <p>If you did not initiate this authentication request, please secure your account credentials immediately.</p>
    `;

    const mailOptions = {
      from: '"DisciplineX" <noreply@disciplinex-tau.vercel.app>',
      to: toEmail,
      subject: title,
      html: getHtmlWrapper(title, content, preheader)
    };

    if (transporter) {
      const { info } = await sendMailWithRetry(transporter, mailOptions);
      console.log(`[Email Service] 2FA OTP email sent successfully to: ${toEmail}`);
      
      // If programmatically generated ethereal mail, log the direct view URL
      if (testAccount && transporter.options.host.includes('ethereal.email')) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`\n======================================================================`);
        console.log(`[ETHEREAL MAILBOX] View sent 2FA OTP email: ${previewUrl}`);
        console.log(`======================================================================\n`);
        return { success: true, previewUrl };
      }
      return { success: true };
    }
  } catch (err) {
    console.error('[Email Service] Failed to send 2FA OTP email after retries:', err.message);
  }
  return { success: false };
};

export const sendResetCodeEmail = async (toEmail, resetCode) => {
  try {
    const transporter = await getTransporter();

    const title = 'Reset Your Password — DisciplineX';
    const preheader = 'Use this 6-digit recovery code to reset your account password.';
    const content = `
      <h2 class="title">Reset Your Password</h2>
      <p>We received a request to reset the password for your DisciplineX account.</p>
      <p>Use the secure 6-digit password recovery code below to complete the reset process:</p>
      <div class="otp-box">${resetCode}</div>
      <div class="notice-box">
        <strong>Validity Expiry:</strong> This recovery code is valid for <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email; your credentials will remain unchanged.
      </div>
    `;

    const mailOptions = {
      from: '"DisciplineX" <noreply@disciplinex-tau.vercel.app>',
      to: toEmail,
      subject: title,
      html: getHtmlWrapper(title, content, preheader)
    };

    if (transporter) {
      const { info } = await sendMailWithRetry(transporter, mailOptions);
      console.log(`[Email Service] Password reset email sent successfully to: ${toEmail}`);
      
      // If programmatically generated ethereal mail, log the direct view URL
      if (testAccount && transporter.options.host.includes('ethereal.email')) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`\n======================================================================`);
        console.log(`[ETHEREAL MAILBOX] View sent password reset email: ${previewUrl}`);
        console.log(`======================================================================\n`);
        return { success: true, previewUrl };
      }
      return { success: true };
    }
  } catch (err) {
    console.error('[Email Service] Failed to send password reset email after retries:', err.message);
  }
  return { success: false };
};

export const sendSecurityAlertEmail = async (toEmail, alertDetails) => {
  try {
    const transporter = await getTransporter();

    const title = `Security Alert: ${alertDetails.eventName} — DisciplineX`;
    const preheader = `A new security event has occurred on your DisciplineX account.`;
    const content = `
      <h2 class="title" style="color: #f59e0b;">Security Alert: ${alertDetails.eventName}</h2>
      <p>A new security event was detected on your DisciplineX account. Please review the details below:</p>
      <table class="device-table">
        <tr>
          <td class="label">Event Type</td>
          <td class="value">${alertDetails.eventName}</td>
        </tr>
        <tr>
          <td class="label">Device/Platform</td>
          <td class="value">${alertDetails.deviceName}</td>
        </tr>
        <tr>
          <td class="label">IP Address</td>
          <td class="value">${alertDetails.ipAddress || 'Unknown IP'}</td>
        </tr>
        <tr>
          <td class="label">Date & Time</td>
          <td class="value">${alertDetails.timestamp ? new Date(alertDetails.timestamp).toUTCString() : new Date().toUTCString()}</td>
        </tr>
      </table>
      <div class="alert-box">
        <strong>Did you perform this action?</strong> If you do not recognize this login or security modification, someone else might have accessed your account. Please **change your password immediately** to secure your account.
      </div>
    `;

    const mailOptions = {
      from: '"DisciplineX Security" <security@disciplinex-tau.vercel.app>',
      to: toEmail,
      subject: title,
      html: getHtmlWrapper(title, content, preheader)
    };

    if (transporter) {
      const { info } = await sendMailWithRetry(transporter, mailOptions);
      console.log(`[Email Service] Security alert email sent successfully to: ${toEmail}`);
      
      if (testAccount && transporter.options.host.includes('ethereal.email')) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        return { success: true, previewUrl };
      }
      return { success: true };
    }
  } catch (err) {
    console.error('[Email Service] Failed to send security alert email after retries:', err.message);
  }
  return { success: false };
};

export const testSmtpConnection = async () => {
  const diagnostics = {
    env: {
      SMTP_HOST: process.env.SMTP_HOST || 'Not Configured',
      SMTP_PORT: process.env.SMTP_PORT || 'Not Configured',
      SMTP_SECURE: process.env.SMTP_SECURE || 'Not Configured',
      SMTP_USER: process.env.SMTP_USER ? 'Configured (Hidden)' : 'Not Configured',
      SMTP_PASS: process.env.SMTP_PASS ? 'Configured (Hidden)' : 'Not Configured',
      NODE_ENV: process.env.NODE_ENV || 'Not Configured',
    },
    transporterVerify: null,
    sendTestMail: null,
    error: null,
    timestamp: new Date().toISOString()
  };

  try {
    const transporter = await getTransporter();
    if (!transporter) {
      diagnostics.error = 'Failed to create transporter: No custom SMTP settings in environment and Ethereal fallback failed.';
      return diagnostics;
    }

    diagnostics.transporterConfig = {
      host: transporter.options.host,
      port: transporter.options.port,
      secure: transporter.options.secure,
    };

    // 1. Verify connection configuration
    try {
      await transporter.verify();
      diagnostics.transporterVerify = 'Success! Transporter is ready to take messages.';
    } catch (verifyErr) {
      diagnostics.transporterVerify = `Failed: ${verifyErr.message}`;
      diagnostics.error = verifyErr.message;
      return diagnostics;
    }

    // 2. Try sending a quick test email to the owner themselves (SMTP_USER)
    if (process.env.SMTP_USER) {
      try {
        const info = await transporter.sendMail({
          from: `"DisciplineX Diagnostics" <${process.env.SMTP_USER}>`,
          to: process.env.SMTP_USER,
          subject: 'DisciplineX SMTP Diagnostics Success',
          text: `SMTP Diagnostics completed successfully at ${new Date().toISOString()} from Railway!`,
          html: `<p>SMTP Diagnostics completed successfully at <strong>${new Date().toISOString()}</strong> from Railway!</p>`
        });
        diagnostics.sendTestMail = `Success! Message ID: ${info.messageId}`;
      } catch (sendErr) {
        diagnostics.sendTestMail = `Failed: ${sendErr.message}`;
        diagnostics.error = sendErr.message;
      }
    } else {
      diagnostics.sendTestMail = 'Skipped: SMTP_USER not configured.';
    }

    return diagnostics;
  } catch (err) {
    diagnostics.error = `Unexpected diagnostics failure: ${err.message}`;
    return diagnostics;
  }
};

