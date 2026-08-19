import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import roomRoutes from './routes/room.routes';
import webrtcRoutes from './routes/webrtc.routes';
import uploadRoutes from './routes/upload.routes';
import socialRoutes from './routes/social.routes';
import adminRoutes from './routes/admin.routes';

// Global Polyfill for BigInt JSON Serialization
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const app = express();

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));

app.use(express.json());

// Root Info Route
app.get('/', (req, res) => {
  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  res.json({
    message: '🚀 MyDonkey Call Backend API Server',
    status: 'online',
    frontendUrl: env.CLIENT_URL,
    healthCheck: `${protocol}://${host}/api/health`,
  });
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/webrtc', webrtcRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', uploadRoutes);

export default app;
