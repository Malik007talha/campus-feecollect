import cron from 'node-cron';
import { refreshFines } from '../services/fine.service.js';

export async function runFineRefresh(reason) {
  try {
    const changed = await refreshFines();
    console.log(`Late fines (${reason}): ${changed} ${changed === 1 ? 'voucher' : 'vouchers'} updated`);
  } catch (err) {
    console.error('Late fine update failed:', err.message);
  }
}

// Every day at 12:05 am Pakistan time
export function startFineJob() {
  cron.schedule('5 0 * * *', () => runFineRefresh('daily job'), { timezone: 'Asia/Karachi' });
  console.log('Late fine job scheduled for 12:05 am (Asia/Karachi) every day');
}