import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}