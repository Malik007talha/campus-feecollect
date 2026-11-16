import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';

import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';

import classRoutes from './routes/class.routes.js';
import studentRoutes from './routes/student.routes.js';
import feeRoutes from './routes/fee.routes.js';
import voucherRoutes from './routes/voucher.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

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

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/vouchers', voucherRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;