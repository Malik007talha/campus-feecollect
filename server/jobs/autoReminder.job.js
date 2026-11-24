import cron from 'node-cron';
import { runAutoReminders } from '../services/autoReminder.service.js';

export async function runAutoReminderJob(reason) {
  try {
    const r = await runAutoReminders();
    if (r.busy || r.off) return;
    console.log(
      `Auto reminders (${reason}): ${r.sent} emailed, ${r.failed} failed, ${r.noEmail} without email, ${r.alreadySent} already sent` +
        (r.stopped ? `. Stopped: ${r.stopped}` : '')
    );
  } catch (err) {
    console.error('Auto reminders failed:', err.message);
  }
}

// Every hour from 9 am to 5 pm Pakistan time. Safe to repeat: nobody is emailed twice.
export function startAutoReminderJob() {
  cron.schedule('0 9-17 * * *', () => runAutoReminderJob('scheduled'), { timezone: 'Asia/Karachi' });
  console.log('Auto reminder job scheduled: hourly, 9 am to 5 pm (Asia/Karachi)');
}

// If the server (re)starts during working hours, check once shortly after start.
export function catchUpAutoReminders() {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: 'numeric', hourCycle: 'h23' }).format(new Date())
  );
  if (hour >= 9 && hour <= 17) setTimeout(() => runAutoReminderJob('server start'), 30000);
}