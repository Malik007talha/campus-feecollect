import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details || null;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Please correct the highlighted fields';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Some information is invalid';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'This record already exists';
    details = Object.keys(err.keyValue || {}).map((f) => ({ field: f, message: 'Must be unique' }));
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = err.name === 'TokenExpiredError'
      ? 'Your session has expired. Please log in again.'
      : 'Invalid login. Please log in again.';
  }

  if (statusCode >= 500) console.error('Server error:', err);

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && env.NODE_ENV === 'production' ? 'Internal server error' : message,
    details,
    ...(env.NODE_ENV !== 'production' && statusCode >= 500 ? { stack: err.stack } : {}),
  });
}