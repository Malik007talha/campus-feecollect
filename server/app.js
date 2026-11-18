import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';

import classRoutes from './routes/class.routes.js';
import studentRoutes from './routes/student.routes.js';
import feeRoutes from './routes/fee.routes.js';
import voucherRoutes from './routes/voucher.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import defaulterRoutes from './routes/defaulter.routes.js';
import reminderRoutes from './routes/reminder.routes.js';
import reportRoutes from './routes/report.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.set('trust proxy', 1); // Render sits behind a proxy; needed so rate limits see the real visitor IP
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-site' } }));

const allowedOrigins = env.CLIENT_URL.split(',').map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      // Allow tools like Postman (no origin) and listed frontends.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

const tooMany = (message) => (req, res) => res.status(429).json({ success: false, message, details: null });

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany('Too many requests. Please wait a moment and try again.'),
});

// Only failed logins count, so staff are never locked out for logging in normally.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany('Too many failed login attempts. Please wait 15 minutes and try again.'),
});

app.use('/api/health', healthRoutes); // health check is not rate limited
app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/defaulters', defaulterRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;