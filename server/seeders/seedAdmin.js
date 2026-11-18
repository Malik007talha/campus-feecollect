import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const strong = (p) => typeof p === 'string' && p.length >= 10 && p.length <= 72 && /[A-Za-z]/.test(p) && /\d/.test(p);

const accounts = [
  {
    role: 'admin',
    name: process.env.SEED_ADMIN_NAME || 'Malik Talha Asif',
    username: (process.env.SEED_ADMIN_USERNAME || 'admin').toLowerCase(),
    email: (process.env.SEED_ADMIN_EMAIL || 'admin@campusfeecollect.pk').toLowerCase(),
    password: process.env.SEED_ADMIN_PASSWORD,
    passwordVar: 'Admin@1234',
  },
  {
    role: 'accountant',
    name: process.env.SEED_ACCOUNTANT_NAME || 'Ayesha Khan',
    username: (process.env.SEED_ACCOUNTANT_USERNAME || 'accountant').toLowerCase(),
    email: (process.env.SEED_ACCOUNTANT_EMAIL || 'accountant@campusfeecollect.pk').toLowerCase(),
    password: process.env.SEED_ACCOUNTANT_PASSWORD,
    passwordVar: 'Account@123',
  },
];

await connectDB();

let failed = false;
for (const a of accounts) {
  const exists = await User.findOne({ username: a.username });
  if (exists) {
    console.log(`Skipped ${a.username}: already exists (password not changed)`);
    continue;
  }
  if (!strong(a.password)) {
    console.error(`Cannot create ${a.username}: set ${a.passwordVar} (10+ characters, letters and numbers)`);
    failed = true;
    continue;
  }
  await User.create({ name: a.name, username: a.username, email: a.email, password: a.password, role: a.role });
  console.log(`Created ${a.role}: ${a.username}`);
}

await mongoose.disconnect();
process.exit(failed ? 1 : 0);