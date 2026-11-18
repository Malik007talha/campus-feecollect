import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import Student from '../models/Student.js';
import Voucher from '../models/Voucher.js';
import SchoolSettings from '../models/SchoolSettings.js';
import FeeConfiguration from '../models/FeeConfiguration.js';
import { generateVouchers } from '../services/voucher.service.js';
import { createPayment } from '../services/payment.service.js';
import { refreshFines } from '../services/fine.service.js';
import { currentMonthKey, shiftMonth } from '../utils/dates.js';
import { pkDateString } from '../utils/fine.js';

const RESET = process.argv.includes('--reset');

const PLAN = [
  { name: 'Class 1', sections: ['A', 'B'], fees: { Tuition: 2500, Transport: 1200 } },
  { name: 'Class 2', sections: ['A'], fees: { Tuition: 2800, Transport: 1200 } },
  { name: 'Class 3', sections: ['A', 'B'], fees: { Tuition: 3000, Transport: 1200, Laboratory: 500 } },
  { name: 'Class 4', sections: ['A'], fees: { Tuition: 3200, Transport: 1200, Laboratory: 600 } },
  { name: 'Class 5', sections: ['A', 'B'], fees: { Tuition: 3500, Transport: 1200, Laboratory: 800 } },
];
const BOYS = ['Ali', 'Ahmed', 'Hamza', 'Usman', 'Bilal', 'Hassan', 'Zain', 'Faisal', 'Talha', 'Saad', 'Danish', 'Ibrahim'];
const GIRLS = ['Fatima', 'Ayesha', 'Zainab', 'Maryam', 'Hira', 'Sana', 'Noor', 'Iqra', 'Amna', 'Laiba', 'Rabia', 'Mahnoor'];
const FAMILIES = ['Raza', 'Khan', 'Sheikh', 'Malik', 'Chaudhry', 'Butt', 'Qureshi', 'Siddiqui', 'Hussain', 'Mirza', 'Ansari', 'Rana', 'Baig', 'Javed', 'Niazi', 'Awan'];
const FATHERS = ['Muhammad', 'Abdul', 'Tariq', 'Nadeem', 'Imran', 'Aslam', 'Khalid', 'Shahid', 'Naveed', 'Rashid', 'Zahid', 'Kamran', 'Waseem', 'Irfan', 'Sajid', 'Arshad'];
const PREFIXES = ['0300', '0301', '0302', '0312', '0315', '0321', '0333', '0345'];
const METHODS = ['cash', 'bank_transfer', 'cheque', 'cash'];

await connectDB();

const admin = await User.findOne({ role: 'admin', isActive: true });
if (!admin) {
  console.error('No admin user found. Run "npm run seed:admin" first.');
  process.exit(1);
}
const accountant = await User.findOne({ role: 'accountant', isActive: true });
const receivers = [admin, accountant].filter(Boolean);

const existing = await Student.countDocuments();
if (existing > 0 && !RESET) {
  console.error(`The database already has ${existing} students.`);
  console.error('To REPLACE all classes, students, vouchers and payments, run: npm run seed:demo -- --reset');
  process.exit(1);
}

if (RESET) {
  console.log('Removing old school data (users and settings are kept)...');
  for (const name of ['classes', 'students', 'vouchers', 'payments', 'counters', 'reminderlogs', 'auditlogs']) {
    await mongoose.connection.collection(name).deleteMany({});
  }
}

/* School settings (fine policy starts as "none" so on-time payers never get a fine) */
await SchoolSettings.getDefault();
await SchoolSettings.updateOne(
  { key: 'default' },
  {
    $set: {
      schoolName: 'My School',
      address: 'Main Boulevard, Gulberg III, Lahore',
      phone: '042-35761234',
      bankName: 'Meezan Bank',
      accountTitle: 'My School',
      accountNumber: '0123-0101234567',
      paymentInstructions: 'Pay at any Meezan Bank branch before the due date and bring the bank copy to the school office.',
      fineType: 'none',
      fineAmount: 0,
      finePercent: 0,
      fineGraceDays: 0,
      fineCap: 0,
    },
  }
);
await FeeConfiguration.getDefault();

/* Classes and fees */
const classDocs = [];
for (const c of PLAN) {
  for (const section of c.sections) {
    classDocs.push({
      name: c.name,
      section,
      monthlyFees: Object.entries(c.fees).map(([head, amount]) => ({ head, amount })),
    });
  }
}
const classes = await Class.insertMany(classDocs);

/* Students: 6 per class section */
const students = [];
let n = 0;
for (const cls of classes) {
  for (let k = 0; k < 6; k += 1) {
    const girl = k % 2 === 1;
    const first = (girl ? GIRLS : BOYS)[(n * 5 + k) % 12];
    const family = FAMILIES[(n * 7 + 3) % FAMILIES.length];
    const father = FATHERS[(n * 3 + 1) % FATHERS.length];
    students.push({
      name: `${first} ${family}`,
      rollNo: String(k + 1).padStart(3, '0'),
      class: cls._id,
      parentName: `${father} ${family}`,
      parentPhone: `${PREFIXES[n % PREFIXES.length]}${String(1000000 + ((n * 7919) % 8999999))}`,
      parentEmail: n % 2 === 0 ? `${father.toLowerCase()}.${family.toLowerCase()}${n}@example.com` : undefined,
      discountType: 'none',
      discountPercent: 0,
      status: 'active',
    });
    n += 1;
  }
}

// Brothers and sisters in different sections share a parent and get a sibling discount.
for (let j = 0; j < students.length - 6; j += 13) {
  const a = students[j];
  const b = students[j + 6];
  b.parentName = a.parentName;
  b.parentPhone = a.parentPhone;
  b.parentEmail = a.parentEmail;
  b.name = `${b.name.split(' ')[0]} ${a.name.split(' ').slice(1).join(' ')}`;
  const code = `FAM-${String(j + 1).padStart(2, '0')}`;
  for (const s of [a, b]) {
    s.familyId = code;
    s.discountType = 'sibling';
    s.discountPercent = 10;
  }
}
Object.assign(students[3], { discountType: 'scholarship', discountPercent: 25 });
Object.assign(students[20], { discountType: 'scholarship', discountPercent: 50 });
students[10].status = 'inactive';
students[30].status = 'left';

await Student.insertMany(students);

/* Vouchers and payments for the last three months */
const current = currentMonthKey();
const today = pkDateString(new Date());
const clamp = (d) => (d > today ? today : d);
const months = [shiftMonth(current, -2), shiftMonth(current, -1), current];
let paymentCount = 0;

for (const [mi, month] of months.entries()) {
  const result = await generateVouchers({
    scope: 'school',
    month,
    dueDate: `${month}-10`,
    userId: admin._id,
  });
  console.log(`${month}: ${result.created} vouchers created`);

  const vouchers = await Voucher.find({ month })
    .sort({ className: 1, section: 1, rollNo: 1 })
    .collation({ locale: 'en', numericOrdering: true })
    .lean();

  for (const [i, v] of vouchers.entries()) {
    const r = i % 20;
    const fullLimit = [18, 14, 9][mi];
    const partialLimit = [18, 16, 12][mi];
    let amount = 0;
    let date = '';
    if (r < fullLimit) {
      amount = v.total;
      date = clamp(`${month}-${String(10 - (i % 6)).padStart(2, '0')}`);
    } else if (r < partialLimit) {
      amount = Math.floor(v.total / 2);
      date = clamp(`${month}-${String(12 + (i % 8)).padStart(2, '0')}`);
    }
    if (amount <= 0) continue;

    const method = METHODS[i % METHODS.length];
    await createPayment({
      voucherId: v._id,
      amount,
      method,
      date,
      note: method === 'cheque' ? `Cheque no. ${100000 + i}` : '',
      user: receivers[i % receivers.length],
    });
    paymentCount += 1;
  }
}

/* Now switch the late fine on: only unpaid and partly paid vouchers get a fine */
await SchoolSettings.updateOne(
  { key: 'default' },
  { $set: { fineType: 'fixed', fineAmount: 200, fineGraceDays: 2, finePercent: 0, fineCap: 0 } }
);
const fined = await refreshFines();

console.log('\nDemo data is ready:');
console.log(`  Classes: ${classes.length}, students: ${students.length}`);
console.log(`  Vouchers: ${await Voucher.countDocuments()}, payments: ${paymentCount}`);
console.log(`  Late fine of Rs 200 (2 grace days) applied to ${fined} overdue vouchers`);

await mongoose.disconnect();
process.exit(0);