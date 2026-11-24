import Voucher from '../models/Voucher.js';
import ReminderLog from '../models/ReminderLog.js';
import SchoolSettings from '../models/SchoolSettings.js';
import { buildVouchersPdf } from './voucherPdf.service.js';
import { emailConfigured, getTransporter, FATAL, friendly } from './reminder.service.js';
import { monthLabel } from '../utils/dates.js';
import { pkDateString } from '../utils/fine.js';
import { env } from '../config/env.js';

const MAX_PER_RUN = 300; // keeps well inside Gmail's daily limit; the next hourly run continues

const rs = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK')}`;
const dateText = (d) => new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' }).replace(/\//g, '-');

// "2026-11-24" + 7 -> "2026-12-01"
function addDays(dateString, n) {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const startOfDay = (dateString) => new Date(`${dateString}T00:00:00+05:00`);

function messageFor(v, school, n) {
  const when = n === 0 ? 'is due today' : n === 1 ? 'is due tomorrow' : `is due in ${n} days`;
  const fineOn = school.fineType && school.fineType !== 'none';
  return [
    `Dear ${v.parentName || 'Parent'},`,
    `This is a friendly reminder from ${school.schoolName}.`,
    `The fee for ${v.studentName} (${v.className} - Section ${v.section}, Roll ${v.rollNo}) for ${monthLabel(v.month)} ${when}, on ${dateText(v.dueDate)}.`,
    `Voucher no.: ${v.voucherNo}\nAmount to pay: ${rs(v.total - v.paid)}`,
    `Please pay on or before the due date${fineOn ? ' to avoid a late fine' : ''}. The fee voucher is attached to this email. If you have already paid, please ignore this message.`,
    school.phone ? `For any question, call ${school.phone}.` : '',
    `Regards,\n${school.schoolName}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

const subjectFor = (v, n) =>
  n === 0
    ? `Fee due today: ${v.studentName} - ${monthLabel(v.month)}`
    : `Fee due in ${n} ${n === 1 ? 'day' : 'days'}: ${v.studentName} - ${monthLabel(v.month)}`;

async function execute(now) {
  const result = { checked: 0, sent: 0, failed: 0, noEmail: 0, alreadySent: 0, stopped: '', capped: false, off: false };

  const school = await SchoolSettings.getDefault();
  if (!school.autoReminderEnabled) {
    result.off = true;
    return result;
  }
  if (!emailConfigured()) {
    result.stopped = 'Email is not set up on the server';
    return result;
  }

  await ReminderLog.init(); // makes sure the unique index exists before claiming
  // A claim left "pending" for 30 minutes means the server stopped mid-send: free it so it can be retried.
  await ReminderLog.deleteMany({ kind: 'auto', status: 'pending', createdAt: { $lt: new Date(now.getTime() - 30 * 60 * 1000) } });

  const days = school.autoReminderDays?.length ? school.autoReminderDays : [3];
  const today = pkDateString(now);

  for (const n of days) {
    const target = addDays(today, n);
    // eslint-disable-next-line no-await-in-loop
    const vouchers = await Voucher.find({
      status: { $in: ['unpaid', 'partial'] },
      dueDate: { $gte: startOfDay(target), $lt: startOfDay(addDays(target, 1)) },
    })
      .populate('student', 'parentEmail status')
      .sort({ className: 1, section: 1, rollNo: 1 })
      .lean();

    for (const v of vouchers) {
      if (result.stopped || result.capped) break;
      if (v.student?.status && v.student.status !== 'active') continue; // left school / inactive
      result.checked += 1;

      const to = v.student?.parentEmail;
      if (!to) {
        result.noEmail += 1;
        continue;
      }
      if (result.sent + result.failed >= MAX_PER_RUN) {
        result.capped = true;
        break;
      }

      // Claim first: the unique index makes sure only one run can ever send this reminder.
      const message = messageFor(v, school, n);
      let claim;
      try {
        // eslint-disable-next-line no-await-in-loop
        claim = await ReminderLog.create({
          voucher: v._id,
          voucherNo: v.voucherNo,
          student: v.student?._id ?? v.student,
          studentName: v.studentName,
          channel: 'email',
          to,
          status: 'pending',
          message,
          kind: 'auto',
          trigger: `auto:${n}`,
        });
      } catch (err) {
        if (err.code === 11000) {
          result.alreadySent += 1;
          continue;
        }
        throw err;
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        const pdf = await buildVouchersPdf([v], school);
        // eslint-disable-next-line no-await-in-loop
        await getTransporter().sendMail({
          from: env.SMTP_FROM || env.SMTP_USER,
          to,
          subject: subjectFor(v, n),
          text: message,
          attachments: [{ filename: `fee-voucher-${v.voucherNo}.pdf`, content: pdf, contentType: 'application/pdf' }],
        });
        // eslint-disable-next-line no-await-in-loop
        await ReminderLog.updateOne({ _id: claim._id }, { $set: { status: 'sent' } });
        result.sent += 1;
      } catch (err) {
        const detail = friendly(err);
        const fatal = FATAL.has(err.code); // email server unreachable: free the claim so a later run retries
        // eslint-disable-next-line no-await-in-loop
        await ReminderLog.updateOne(
          { _id: claim._id },
          fatal ? { $set: { status: 'failed', error: detail }, $unset: { trigger: 1 } } : { $set: { status: 'failed', error: detail } }
        );
        result.failed += 1;
        if (fatal) result.stopped = detail;
      }
    }
  }
  return result;
}

let running = false;

export async function runAutoReminders(now = new Date()) {
  if (running) return { busy: true };
  running = true;
  try {
    return await execute(now);
  } finally {
    running = false;
  }
}