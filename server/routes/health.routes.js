import { Router } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/apiResponse.js';
import { APP_TIMEZONE } from '../config/env.js';

const router = Router();

router.get('/', (req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  sendSuccess(res, {
    message: 'Campus FeeCollect API is running',
    data: {
      service: 'Campus FeeCollect API',
      database: dbStates[mongoose.connection.readyState] || 'unknown',
      timezone: APP_TIMEZONE,
      serverTime: new Date().toLocaleString('en-GB', { timeZone: APP_TIMEZONE }),
    },
  });
});

export default router;