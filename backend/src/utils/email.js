import nodemailer from 'nodemailer';

let testAccount = null;

const getTransporter = async () => {
  // If custom SMTP settings are provided in env, use them
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
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
    });
  }

  // Local fallback if Ethereal creation fails
  return null;
};

export const sendVerificationEmail = async (toEmail, verifyUrl) => {
  try {
    const transporter = await getTransporter();
    
    const mailOptions = {
      from: '"DisciplineX" <noreply@disciplinex-tau.vercel.app>',
      to: toEmail,
      subject: 'Verify Your Email Address — DisciplineX',
      text: `DisciplineX — Verify Your Email Address

Consistency over intensity.

Thank you for creating an account with DisciplineX. To start tracking your habits, routines, and scheduling your productivity milestones, please verify your email address by clicking the secure link below:

Verify Email Address:
${verifyUrl}

If the link does not open, please copy and paste it into your browser's address bar.

If you did not request this verification, please ignore this email.

This email was sent from the DisciplineX secure authentication service.`
    };

    if (transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Service] Verification email sent to: ${toEmail}`);
      
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
    console.error('[Email Service] Failed to send verification email:', err.message);
  }
  return { success: false };
};

export const sendOtpEmail = async (toEmail, otpCode) => {
  try {
    const transporter = await getTransporter();
    
    const mailOptions = {
      from: '"DisciplineX" <noreply@disciplinex-tau.vercel.app>',
      to: toEmail,
      subject: 'Your 2FA Verification Code — DisciplineX',
      text: `DisciplineX — Two-Factor Authentication

Consistency over intensity.

Your secure 2FA One-Time Passcode (OTP) is:

------------------------
${otpCode}
------------------------

This code is valid for 15 minutes.

If you did not initiate this authentication request, please secure your account credentials immediately.

This email was sent from the DisciplineX secure authentication service.`
    };

    if (transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Service] 2FA OTP email sent to: ${toEmail}`);
      
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
    console.error('[Email Service] Failed to send 2FA OTP email:', err.message);
  }
  return { success: false };
};

export const sendResetCodeEmail = async (toEmail, resetCode) => {
  try {
    const transporter = await getTransporter();
    
    const mailOptions = {
      from: '"DisciplineX" <noreply@disciplinex-tau.vercel.app>',
      to: toEmail,
      subject: 'Reset Your Password — DisciplineX',
      text: `DisciplineX — Reset Your Password

Consistency over intensity.

We received a request to reset the password for your DisciplineX account. Use the secure 6-digit reset code below to complete the reset process:

------------------------
${resetCode}
------------------------

This reset code is valid for 15 minutes.

If you did not request a password reset, please disregard this email. Your password will remain unchanged.

This email was sent from the DisciplineX secure authentication service.`
    };

    if (transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Service] Password reset email sent to: ${toEmail}`);
      
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
    console.error('[Email Service] Failed to send password reset email:', err.message);
  }
  return { success: false };
};

