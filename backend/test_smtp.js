import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const runTest = async () => {
  console.log('[SMTP Test] Initializing nodemailer with:');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // Port 587 is secure: false because it uses STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 5000,
    socketTimeout: 5000,
  });

  const mailOptions = {
    from: '"DisciplineX Test" <noreply@disciplinex-tau.vercel.app>',
    to: 'gowthmkrishna18v@gmail.com',
    subject: 'SMTP Diagnostics Test',
    text: 'If you receive this, SMTP is working perfectly from your local machine!'
  };

  try {
    console.log('[SMTP Test] Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('[SMTP Test] Success! Message ID:', info.messageId);
  } catch (err) {
    console.error('[SMTP Test] FAILED with error:', err.message);
    if (err.stack) console.error(err.stack);
  }
};

runTest();
