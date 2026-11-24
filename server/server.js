import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { startFineJob, runFineRefresh } from './jobs/fine.job.js';
import { startAutoReminderJob, catchUpAutoReminders } from './jobs/autoReminder.job.js';

async function start() {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
  startFineJob();
  runFineRefresh('server start'); // catches up if the server was off at midnight
  startAutoReminderJob();
  catchUpAutoReminders();
}

start();