import nodemailer from 'nodemailer';
import Voucher from '../models/Voucher.js';
import ReminderLog from '../models/ReminderLog.js';
import SchoolSettings from '../models/SchoolSettings.js';
import { refreshFines } from './fine.service.js';
import { monthLabel } from '../utils/dates.js';
import { env } from '../config/env.js';

const rs = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK')}`;
const dateText = (d) => new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' }).replace(/\//g, '-');
const short = (text) => String(text ?? '').slice(0, 300);

export const emailConfigured = () => Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

let transporter;
function getTransporter() {
  if (!transporter) {
    const port = Number(env.SMTP_PORT) || 587;
    // Google displays App Passwords in groups separated by spaces; SMTP expects the 16 characters only.
    const password = env.SMTP_HOST?.toLowerCase() === 'smtp.gmail.com'
      ? env.SMTP_PASS.replace(/\s+/g, '')
      : env.SMTP_PASS;
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: env.SMTP_USER, pass: password },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }
  return transporter;
}

function emailText(v, school) {
  const balance = v.total - v.paid;
  return [
    `Dear ${v.parentName || 'Parent'},`,
    `This is a reminder from ${school.schoolName}.`,
    `The fee for ${v.studentName} (${v.className} - Section ${v.section}, Roll ${v.rollNo}) for ${monthLabel(v.month)} was due on ${dateText(v.dueDate)}.`,
    `Voucher no.: ${v.voucherNo}\nPending amount: ${rs(balance)}${v.fine > 0 ? ` (includes a late fine of ${rs(v.fine)})` : ''}`,
    'Please pay as soon as possible. If you have already paid, please ignore this message.',
    school.phone ? `For any question, call ${school.phone}.` : '',
    `Regards,\n${school.schoolName}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

// Errors that mean "email is not working at all", so there is no point trying the next student.
const FATAL = new Set(['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS']);

function friendly(err) {
  if (err.code === 'EAUTH') return 'The email server refused the login. Check SMTP_USER and SMTP_PASS (use a Gmail App password).';
  if (FATAL.has(err.code)) return 'Could not connect to the email server. Check SMTP_HOST and SMTP_PORT, and the internet connection.';
  return short(err.message);
}

export async function sendReminders({ voucherIds, force, user }) {
  await refreshFines({ _id: { $in: voucherIds } }); // the message shows today's balance

  const [vouchers, school] = await Promise.all([
    Voucher.find({ _id: { $in: voucherIds } })
      .populate('student', 'parentEmail')
      .sort({ className: 1, section: 1, rollNo: 1 })
      .lean(),
    SchoolSettings.getDefault(),
  ]);

  // Avoid emailing the same parent twice in one day, unless one student was chosen on purpose.
  const recent = force
    ? []
    : await ReminderLog.find({
        voucher: { $in: voucherIds },
        channel: 'email',
        status: 'sent',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })
        .select('voucher')
        .lean();
  const recentSet = new Set(recent.map((r) => String(r.voucher)));

  const results = [];
  const summary = { sent: 0, failed: 0, skipped: 0 };
  const add = (v, status, detail) => {
    results.push({ voucherId: v._id, voucherNo: v.voucherNo, studentName: v.studentName, channel: 'email', status, detail });
    summary[status] += 1;
  };

  let stopReason = '';
  for (const v of vouchers) {
    if (stopReason) {
      add(v, 'skipped', `Not tried: ${stopReason}`);
      continue;
    }
    if (!['unpaid', 'partial'].includes(v.status)) {
      add(v, 'skipped', 'Already fully paid');
      continue;
    }
    if (recentSet.has(String(v._id))) {
      add(v, 'skipped', 'Already emailed in the last 24 hours');
      continue;
    }
    const to = v.student?.parentEmail;
    if (!to) {
      add(v, 'skipped', 'No email address on file. Add the parent email on the student.');
      continue;
    }

    const message = emailText(v, school);
    let status = 'sent';
    let detail = 'Email sent';
    try {
      await getTransporter().sendMail({
        from: env.SMTP_FROM || env.SMTP_USER,
        to,
        subject: `Fee reminder: ${v.studentName} - ${monthLabel(v.month)}`,
        text: message,
      });
    } catch (err) {
      status = 'failed';
      detail = friendly(err);
      if (FATAL.has(err.code)) stopReason = detail;
    }

    await ReminderLog.create({
      voucher: v._id,
      voucherNo: v.voucherNo,
      student: v.student?._id ?? v.student,
      studentName: v.studentName,
      channel: 'email',
      to,
      status,
      message,
      error: status === 'failed' ? detail : '',
      sentBy: user._id,
      sentByName: user.name,
    });
    add(v, status, detail);
  }

  return { summary, results };
}
