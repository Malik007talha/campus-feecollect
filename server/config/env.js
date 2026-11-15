import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\nInvalid environment configuration:');
  parsed.error.issues.forEach((issue) => {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  });
  console.error('\nCheck your server/.env file against .env.example\n');
  process.exit(1);
}

export const env = parsed.data;
export const APP_TIMEZONE = 'Asia/Karachi';