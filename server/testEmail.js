import 'dotenv/config';
import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error('Add SMTP_HOST, SMTP_USER and SMTP_PASS to server/.env first.');
  process.exit(1);
}

const port = Number(SMTP_PORT) || 587;
const transporter = nodemailer.createTransport({
  host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS },
  connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
});

try {
  await transporter.verify();
  console.log('Login works. Sending a test email to', SMTP_USER);
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: SMTP_USER,
    subject: 'Campus FeeCollect email test',
    text: 'If you can read this, fee reminders will be sent correctly.',
  });
  console.log('Test email sent. Check your inbox (and Spam).');
} catch (err) {
  console.error('Email failed:', err.code || '', err.message);
  process.exit(1);
}