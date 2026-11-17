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
export const smsConfigured = () => Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM);

let transporter;
function getTransporter() {
  if (!transporter) {
    const port = Number(env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

/* --------------------------------- Message text --------------------------------- */

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

function smsText(v, school) {
  const balance = v.total - v.paid;
  return `${school.schoolName}: Fee reminder for ${v.studentName} (${v.className}-${v.section}), voucher ${v.voucherNo}, ${monthLabel(v.month)}. Due ${dateText(v.dueDate)}. Pending ${rs(balance)}. Please pay soon. Ignore if already paid.`;
}

const testModeLog = (channel, to, message) =>
  console.log(`\n[REMINDER - TEST MODE, NOT SENT] ${channel.toUpperCase()} to ${to}\n${message}\n`);

/* ------------------------------------ Senders ------------------------------------ */

async function sendEmail(v, school) {
  const to = v.student?.parentEmail;
  if (!to) return { status: 'skipped', detail: 'No email address on file' };
  const message = emailText(v, school);

  if (!emailConfigured()) {
    testModeLog('email', to, message);
    return { status: 'logged', to, message, detail: 'Test mode: written to the server console, not sent' };
  }
  try {
    await getTransporter().sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to,
      subject: `Fee reminder: ${v.studentName} - ${monthLabel(v.month)}`,
      text: message,
    });
    return { status: 'sent', to, message, detail: 'Email sent' };
  } catch (err) {
    return { status: 'failed', to, message, detail: short(err.message) };
  }
}

async function sendSms(v, school) {
  if (!v.parentPhone) return { status: 'skipped', detail: 'No phone number on file' };
  const to = `+92${v.parentPhone.replace(/^0/, '')}`; // 03001234567 -> +923001234567
  const message = smsText(v, school);

  if (!smsConfigured()) {
    testModeLog('sms', to, message);
    return { status: 'logged', to, message, detail: 'Test mode: written to the server console, not sent' };
  }
  try {
    const sid = env.TWILIO_ACCOUNT_SID;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: env.TWILIO_FROM, Body: message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `SMS service answered with status ${res.status}`);
    return { status: 'sent', to, message, detail: 'SMS sent' };
  } catch (err) {
    return { status: 'failed', to, message, detail: short(err.message) };
  }
}

/* ------------------------------------ Sending ------------------------------------ */

export async function sendReminders({ voucherIds, channel, force, user }) {
  await refreshFines({ _id: { $in: voucherIds } }); // the message shows today's balance

  const [vouchers, school] = await Promise.all([
    Voucher.find({ _id: { $in: voucherIds } })
      .populate('student', 'parentEmail')
      .sort({ className: 1, section: 1, rollNo: 1 })
      .lean(),
    SchoolSettings.getDefault(),
  ]);

  const channels = channel === 'both' ? ['email', 'sms'] : [channel];

  // Avoid messaging the same parent twice in one day, unless the user chose one student on purpose.
  const recent = force
    ? []
    : await ReminderLog.find({
        voucher: { $in: voucherIds },
        channel: { $in: channels },
        status: { $in: ['sent', 'logged'] },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })
        .select('voucher channel')
        .lean();
  const recentSet = new Set(recent.map((r) => `${r.voucher}|${r.channel}`));

  const results = [];
  const summary = { sent: 0, logged: 0, failed: 0, skipped: 0 };
  const add = (v, ch, status, detail) => {
    results.push({ voucherId: v._id, voucherNo: v.voucherNo, studentName: v.studentName, channel: ch, status, detail });
    summary[status] += 1;
  };

  for (const v of vouchers) {
    for (const ch of channels) {
      if (!['unpaid', 'partial'].includes(v.status)) {
        add(v, ch, 'skipped', 'Already fully paid');
        continue;
      }
      if (recentSet.has(`${v._id}|${ch}`)) {
        add(v, ch, 'skipped', 'Already reminded in the last 24 hours');
        continue;
      }

      const out = ch === 'email' ? await sendEmail(v, school) : await sendSms(v, school);
      if (out.status === 'skipped') {
        add(v, ch, 'skipped', out.detail);
        continue;
      }

      await ReminderLog.create({
        voucher: v._id,
        voucherNo: v.voucherNo,
        student: v.student?._id ?? v.student,
        studentName: v.studentName,
        channel: ch,
        to: out.to,
        status: out.status,
        message: out.message,
        error: out.status === 'failed' ? out.detail : '',
        sentBy: user._id,
        sentByName: user.name,
      });
      add(v, ch, out.status, out.detail);
    }
  }

  return { summary, results };
}