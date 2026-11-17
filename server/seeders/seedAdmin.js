import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

await connectDB();

const users = [
  { name: 'Malik Talha Asif', username: 'admin', email: 'admin@campusfeecollect.pk', password: 'Admin@1234', role: 'admin' },
  { name: 'Ayesha Khan', username: 'accountant', email: 'accountant@campusfeecollect.pk', password: 'Account@12345', role: 'accountant' },
];

for (const u of users) {
  const exists = await User.findOne({ username: u.username });
  if (exists) {
    console.log(`↩︎ ${u.username} already exists, skipped`);
  } else {
    await User.create(u);
    console.log(`Created ${u.role}: ${u.username}`);
  }
}

await mongoose.disconnect();