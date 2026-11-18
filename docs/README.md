# Campus FeeCollect

**School fee management system** (Project DPO-083, Digital Portal Official).
Generate every student's monthly fee voucher in one click, print three-copy PDF vouchers, record full or partial payments, add late fines automatically, and see who has not paid.

- **Live app:** https://campus-feecollect.vercel.app
- **Live API:** https://YOUR-API.onrender.com/api/health
- **Demo video:** (add the link here)
- **Developer:** Malik Talha Asif

> The free servers go to sleep when idle. The first request after a break can take up to a minute.

## Screenshots

| | |
|---|---|
| ![Login](docs/screenshots/01-login.png) | ![Dashboard](docs/screenshots/02-dashboard.png) |
| ![Classes](docs/screenshots/03-classes.png) | ![Students](docs/screenshots/04-students.png) |
| ![Excel import](docs/screenshots/05-import-preview.png) | ![Fee structure](docs/screenshots/06-fee-structure.png) |
| ![Generate vouchers](docs/screenshots/07-generate-vouchers.png) | ![Voucher PDF](docs/screenshots/08-voucher-pdf.png) |
| ![Record payment](docs/screenshots/09-record-payment.png) | ![Receipt](docs/screenshots/10-receipt-pdf.png) |
| ![Unpaid fees](docs/screenshots/11-unpaid-fees.png) | ![Reports](docs/screenshots/12-reports.png) |
| ![Late fine settings](docs/screenshots/13-settings-fines.png) | ![Mobile](docs/screenshots/14-mobile.png) |

## Features

- **Classes, sections and students** with search, filters and **Excel bulk import** (template, preview, error highlighting, duplicate roll numbers, summary).
- **Fee structure** per class (Tuition, Transport, Laboratory and your own fee types) with sibling and scholarship discounts.
- **One-click voucher generation** for the whole school or one class, with a confirmation screen. Clicking twice never creates duplicates: a **unique index on student + month**, atomic voucher numbers and `insertMany`.
- **Printable three-part PDF** (Bank, School and Student copy) on one A4 page, made with pdfkit.
- **Full and partial payments** in a database transaction, overpayment blocked, append-only payment records and A5 receipts.
- **Automatic late fines** (none, fixed, per day or percentage, with grace days and a maximum). Always calculated on the server, never typed in, and never applied twice.
- **Unpaid fees** list by class with totals, plus **email (Nodemailer) and SMS (Twilio) reminders**. Without credentials, reminders are logged to the server console.
- **Dashboard and six printable reports.**
- **Roles:** Admin and Accountant, enforced on the server. Users page, change password, voucher deletion with an audit record.
- English and Urdu interface (right-to-left), responsive on phone, tablet and desktop. Rs amounts, Pakistani phone formats, DD-MM-YYYY dates, Asia/Karachi time.

## Tech stack

React + Vite, Tailwind CSS, React Router, Axios, React Hook Form, Zod, Recharts · Node.js, Express, MongoDB Atlas + Mongoose, JWT, bcryptjs, pdfkit, exceljs, node-cron, Nodemailer, Twilio (web API) · Vercel + Render.

## Project structure

```
campus-feecollect/
├── client/        React app (pages, components, services, context, utils)
├── server/        Express API (models, controllers, routes, services, validators, jobs, seeders)
├── docs/          API_DOCUMENTATION.md and screenshots
├── postman/       Campus-FeeCollect.postman_collection.json
└── README.md
```

## Run it on your computer

You need Node.js 20+, Git and a free MongoDB Atlas cluster.

```bash
git clone https://github.com/Malik007talha/campus-feecollect.git
cd campus-feecollect

# API
cd server
npm install
cp .env.example .env        # then fill in the values (see below)
npm run seed:admin          # creates the Admin and Accountant logins
npm run seed:demo           # optional: realistic Pakistani sample data
npm run dev                 # http://localhost:5000

# App (new terminal)
cd client
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

### Environment variables

`server/.env`

| Variable | Meaning |
|---|---|
| `MONGODB_URI` | Atlas connection string, with a database name |
| `JWT_SECRET` | Long random text (32+ characters) |
| `JWT_EXPIRES_IN` | For example `1d` |
| `CLIENT_URL` | The app's address, for example `http://localhost:5173` |
| `SEED_ADMIN_PASSWORD`, `SEED_ACCOUNTANT_PASSWORD` | Used only by `npm run seed:admin` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional, for real email reminders |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | Optional, for real SMS reminders |

`client/.env`: `VITE_API_URL=http://localhost:5000/api`

No secrets are stored in the code or in this repository.

## Scripts (server)

| Command | What it does |
|---|---|
| `npm run dev` | Start the API with auto-reload |
| `npm start` | Start the API (production) |
| `npm run seed:admin` | Create the Admin and Accountant users from the environment variables |
| `npm run seed:demo` | Add demo classes, students, vouchers and payments (add `-- --reset` to replace all school data) |

## How the main rules work

- **Voucher number:** `FC-YYYYMM-00001`, reserved atomically.
- **Discount:** a percentage taken off the total of all fee items.
- **Late fine:** set in Settings (off until the Admin chooses a policy). The fine is calculated from the policy and today's date, so repeating the calculation never doubles it. It never goes down automatically. It is refreshed daily at 12:05 am, at server start, and whenever a voucher is viewed, downloaded or paid.
- **Payments:** whole rupees, never above the balance, never edited or deleted.
- **Vouchers keep a copy** of the student, class and fee amounts when generated, so later changes do not alter old vouchers.

## API and Postman

- Full list of routes: [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)
- Postman: import [`postman/Campus-FeeCollect.postman_collection.json`](postman/Campus-FeeCollect.postman_collection.json), set `baseUrl`, `identifier` and `password`, then run **Auth / Login**.

## Security

Passwords are hashed with bcrypt. Every route checks the login token and the user's role on the server. Input is validated with Zod. Old sessions end when a password changes. Login attempts are rate limited and standard security headers are enabled. Secrets live only in environment variables.