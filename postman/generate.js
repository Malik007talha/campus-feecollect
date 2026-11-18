// Run from the project root:  node postman/generate.js
const fs = require('fs');
const path = require('path');

const evt = (lines) => [{ listen: 'test', script: { type: 'text/javascript', exec: lines } }];
const ok = ["pm.test('Status code is 2xx', function () { pm.expect(pm.response.code).to.be.within(200, 299); });"];
const capture = (variable, expr) => [
  ...ok,
  'try {',
  '  const body = pm.response.json();',
  `  const value = ${expr};`,
  `  if (value) pm.collectionVariables.set('${variable}', value);`,
  '} catch (e) { /* nothing to capture */ }',
];

function req(name, method, route, o = {}) {
  const [pathPart, qs] = route.split('?');
  const request = {
    method,
    header: [],
    url: { raw: `{{baseUrl}}${route}`, host: ['{{baseUrl}}'], path: pathPart.replace(/^\//, '').split('/') },
    description: [o.role ? `Who can use it: ${o.role}.` : '', o.note || ''].filter(Boolean).join(' '),
  };
  if (qs) request.url.query = qs.split('&').map((p) => ({ key: p.split('=')[0], value: p.split('=')[1] }));
  if (o.body) {
    request.header.push({ key: 'Content-Type', value: 'application/json' });
    request.body = { mode: 'raw', raw: JSON.stringify(o.body, null, 2), options: { raw: { language: 'json' } } };
  }
  if (o.file) {
    request.header.push({
      key: 'Content-Type',
      value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    request.body = { mode: 'file', file: {} };
  }
  if (o.noAuth) request.auth = { type: 'noauth' };
  return { name, request, event: evt(o.test || ok) };
}

const ADMIN = 'Admin';
const BOTH = 'Admin, Accountant';
const importRow = {
  rowNumber: 2,
  data: {
    name: 'Postman Student', rollNo: '901', className: 'Class 5', section: 'A', parentName: 'Test Parent',
    parentPhone: '0300-1234567', parentEmail: '', discountType: 'none', discountPercent: '', familyId: '',
  },
};

const folders = [
  ['Health', [req('Health check', 'GET', '/health', { noAuth: true, role: 'Anyone' })]],
  [
    'Auth',
    [
      req('Login', 'POST', '/auth/login', {
        noAuth: true,
        role: 'Anyone',
        body: { identifier: '{{identifier}}', password: '{{password}}' },
        note: 'Saves the token automatically for all other requests. Set the identifier and password variables first.',
        test: [...ok, "pm.collectionVariables.set('token', pm.response.json().data.token);"],
      }),
      req('Current user', 'GET', '/auth/me', { role: BOTH }),
      req('Change password', 'POST', '/auth/change-password', {
        role: BOTH,
        body: { currentPassword: '{{password}}', newPassword: 'ChangeMe12345' },
        note: 'This really changes the password. Update the password variable afterwards.',
        test: [...ok, "pm.collectionVariables.set('token', pm.response.json().data.token);"],
      }),
    ],
  ],
  [
    'Users',
    [
      req('List users', 'GET', '/users', { role: ADMIN, test: capture('userId', 'body.data[body.data.length - 1]._id') }),
      req('Create user', 'POST', '/users', {
        role: ADMIN,
        body: { name: 'Test Accountant', username: 'test.accountant', email: 'test.accountant@example.com', password: 'ChangeMe12345', role: 'accountant' },
      }),
      req('Update user', 'PATCH', '/users/{{userId}}', { role: ADMIN, body: { name: 'Updated Name' } }),
    ],
  ],
  [
    'Classes',
    [
      req('List classes', 'GET', '/classes?page=1&limit=20', { role: BOTH, test: capture('classId', 'body.data[0]._id') }),
      req('Class names', 'GET', '/classes/names', { role: BOTH }),
      req('Class options (dropdown)', 'GET', '/classes/options', { role: BOTH }),
      req('Get class', 'GET', '/classes/{{classId}}', { role: BOTH }),
      req('Create class sections', 'POST', '/classes', { role: ADMIN, body: { name: 'Class 6', sections: ['A', 'B'] } }),
      req('Update class', 'PATCH', '/classes/{{classId}}', { role: ADMIN, body: { section: 'A' } }),
      req('Delete class', 'DELETE', '/classes/{{classId}}', { role: ADMIN, note: 'Deletes only a section with no students.' }),
    ],
  ],
  [
    'Students',
    [
      req('List students', 'GET', '/students?page=1&limit=20', { role: BOTH, test: capture('studentId', 'body.data[0]._id') }),
      req('Get student', 'GET', '/students/{{studentId}}', { role: BOTH }),
      req('Create student', 'POST', '/students', {
        role: ADMIN,
        body: {
          name: 'Postman Student', rollNo: '902', classId: '{{classId}}', parentName: 'Test Parent', parentPhone: '0300-1234567',
          parentEmail: '', discountType: 'none', discountPercent: 0,
        },
      }),
      req('Update student', 'PATCH', '/students/{{studentId}}', { role: ADMIN, body: { parentName: 'Updated Parent' } }),
      req('Delete student', 'DELETE', '/students/{{studentId}}', { role: ADMIN, note: 'Refused when the student has vouchers.' }),
      req('Import: download template', 'GET', '/students/import/template', { role: ADMIN }),
      req('Import: upload and check file', 'POST', '/students/import/parse', {
        role: ADMIN,
        file: true,
        note: 'In Body, choose "binary" and select your .xlsx file.',
      }),
      req('Import: re-check rows', 'POST', '/students/import/validate', { role: ADMIN, body: { rows: [importRow] } }),
      req('Import: save valid rows', 'POST', '/students/import/commit', { role: ADMIN, body: { rows: [importRow] } }),
    ],
  ],
  [
    'Fees',
    [
      req('List fee types', 'GET', '/fees/heads', { role: ADMIN }),
      req('Add fee type', 'POST', '/fees/heads', { role: ADMIN, body: { name: 'Library fee' } }),
      req('Remove fee type', 'DELETE', '/fees/heads/Library%20fee', { role: ADMIN }),
      req('Fee structure', 'GET', '/fees/structure', { role: ADMIN }),
      req('Save fee structure', 'PUT', '/fees/structure', {
        role: ADMIN,
        body: { classIds: ['{{classId}}'], fees: [{ head: 'Tuition', amount: 3000 }, { head: 'Transport', amount: 1200 }] },
      }),
      req('Student discounts', 'GET', '/fees/discounts', { role: ADMIN }),
    ],
  ],
  [
    'Vouchers',
    [
      req('Preview generation', 'POST', '/vouchers/preview', { role: BOTH, body: { scope: 'school', month: '{{month}}', dueDate: '{{dueDate}}' } }),
      req('Generate vouchers', 'POST', '/vouchers/generate', {
        role: BOTH,
        body: { scope: 'school', month: '{{month}}', dueDate: '{{dueDate}}' },
        note: 'Safe to repeat: a second call creates nothing new.',
      }),
      req('List vouchers', 'GET', '/vouchers?month={{month}}&page=1&limit=20', { role: BOTH, test: capture('voucherId', 'body.data.items[0]._id') }),
      req('Get voucher', 'GET', '/vouchers/{{voucherId}}', { role: BOTH }),
      req('Voucher PDF', 'GET', '/vouchers/{{voucherId}}/pdf', { role: BOTH }),
      req('All vouchers PDF (one month)', 'GET', '/vouchers/pdf?month={{month}}', { role: BOTH }),
      req('Delete voucher', 'DELETE', '/vouchers/{{voucherId}}', {
        role: ADMIN,
        body: { reason: 'Generated for the wrong student' },
        note: 'Only a voucher with no payment can be deleted.',
      }),
    ],
  ],
  [
    'Payments',
    [
      req('Find unpaid vouchers', 'GET', '/payments/search?q=', { role: BOTH, test: capture('payVoucherId', 'body.data.items[0]._id') }),
      req('Record payment', 'POST', '/payments', {
        role: BOTH,
        body: { voucherId: '{{payVoucherId}}', amount: 500, method: 'cash', date: '{{today}}', note: 'Postman test' },
        test: capture('paymentId', 'body.data.payment._id'),
      }),
      req('List payments', 'GET', '/payments?page=1&limit=20', { role: BOTH, test: capture('paymentId', 'body.data.items[0]._id') }),
      req('Payments of one voucher', 'GET', '/payments/voucher/{{voucherId}}', { role: BOTH }),
      req('Get payment', 'GET', '/payments/{{paymentId}}', { role: BOTH }),
      req('Receipt PDF', 'GET', '/payments/{{paymentId}}/receipt', { role: BOTH }),
    ],
  ],
  ['Unpaid fees', [req('List defaulters', 'GET', '/defaulters?sort=due_asc&page=1&limit=20', { role: BOTH })]],
  [
    'Reminders',
    [
      req('Reminder mode (live or test)', 'GET', '/reminders/status', { role: BOTH }),
      req('Send reminder', 'POST', '/reminders/send', { role: BOTH, body: { voucherIds: ['{{voucherId}}'], channel: 'sms' } }),
      req('Reminder history', 'GET', '/reminders?page=1&limit=20', { role: BOTH }),
    ],
  ],
  [
    'Reports',
    [
      req('Monthly collection', 'GET', '/reports/collection', { role: BOTH }),
      req('Pending fees', 'GET', '/reports/pending', { role: BOTH }),
      req('Class-wise collection', 'GET', '/reports/classwise?month={{month}}', { role: BOTH }),
      req('Student payment history', 'GET', '/reports/history?search=ali', { role: BOTH }),
      req('Defaulters', 'GET', '/reports/defaulters', { role: BOTH }),
      req('Discounts', 'GET', '/reports/discounts', { role: BOTH }),
    ],
  ],
  ['Dashboard', [req('Dashboard', 'GET', '/dashboard?month={{month}}', { role: BOTH })]],
  [
    'Settings',
    [
      req('Get settings', 'GET', '/settings', { role: ADMIN }),
      req('Save settings', 'PUT', '/settings', {
        role: ADMIN,
        body: {
          schoolName: 'My School', address: 'Gulberg III, Lahore', phone: '042-35761234', bankName: 'Meezan Bank',
          accountTitle: 'My School', accountNumber: '', paymentInstructions: '',
        },
      }),
      req('Get late fine policy', 'GET', '/settings/fines', { role: ADMIN }),
      req('Save late fine policy', 'PUT', '/settings/fines', {
        role: ADMIN,
        body: { fineType: 'fixed', fineAmount: 200, finePercent: 0, fineGraceDays: 2, fineCap: 0 },
      }),
    ],
  ],
];

const vars = {
  baseUrl: 'http://localhost:5000/api', identifier: 'admin', password: 'CHANGE_ME', token: '',
  month: currentMonth(), dueDate: `${currentMonth()}-10`, classId: '', studentId: '', voucherId: '', payVoucherId: '', paymentId: '', userId: '',
};
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const collection = {
  info: {
    name: 'Campus FeeCollect API',
    description:
      'Every API route of Campus FeeCollect. 1) Set identifier and password in the collection variables. 2) Run "Auth / Login". 3) Run any request: the token and ids are filled in automatically.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
  event: [
    {
      listen: 'prerequest',
      script: { type: 'text/javascript', exec: ["pm.collectionVariables.set('today', new Date().toISOString().slice(0, 10));"] },
    },
  ],
  variable: Object.entries(vars).map(([key, value]) => ({ key, value })),
  item: folders.map(([name, item]) => ({ name, item })),
};

const out = path.join(__dirname, 'Campus-FeeCollect.postman_collection.json');
fs.writeFileSync(out, JSON.stringify(collection, null, 2));
const total = folders.reduce((sum, [, items]) => sum + items.length, 0);
console.log(`Wrote ${out} with ${total} requests in ${folders.length} folders`);