import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET || 'mydonkey-super-secret-jwt-key-2026',
  SESSION_SECRET: process.env.SESSION_SECRET || 'mydonkey-session-secret',
  DEFAULT_CHUNK_SIZE_MB: parseInt(process.env.DEFAULT_CHUNK_SIZE_MB || '10', 10),
};
