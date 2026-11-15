import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
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
// Module routes (auth, classes, students, ...) are mounted here in later steps.

app.use(notFound);
app.use(errorHandler);

export default app;