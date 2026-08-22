import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import roomRoutes from './routes/room.routes';
import webrtcRoutes from './routes/webrtc.routes';
import uploadRoutes from './routes/upload.routes';
import socialRoutes from './routes/social.routes';
import adminRoutes from './routes/admin.routes';
import { trackResponseBytes } from './utils/bandwidthTracker';

// Global Polyfill for BigInt JSON Serialization
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const app = express();

// Custom High-Resiliency CORS & Header Middleware (Must be FIRST before any other middleware)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Access-Control-Allow-Headers, Content-Type, Authorization, Origin, Accept, Range, Content-Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});


// HTTP Response Compression Middleware (Compress JSON/Text API payloads)
app.use(
  compression({
    filter: (req, res) => {
      // Do not compress binary octet-streams or streaming video responses
      if (req.headers['x-no-compression'] || req.path.includes('/videos/stream')) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// Production-Safe Bandwidth Response Monitoring Middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  let bytesWritten = 0;

  const originalWrite = res.write;
  const originalEnd = res.end;

  res.write = function (chunk: any, ...args: any[]): boolean {
    if (chunk) {
      bytesWritten += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
    }
    return originalWrite.apply(res, [chunk, ...args] as any);
  };

  res.end = function (chunk?: any, ...args: any[]): any {
    if (chunk) {
      bytesWritten += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
    }
    trackResponseBytes(bytesWritten);
    const duration = Date.now() - startTime;
    const isBandwidthDebug = process.env.BANDWIDTH_DEBUG === 'true';

    if (isBandwidthDebug || bytesWritten > 1024 * 1024) {
      const sizeStr =
        bytesWritten >= 1024 * 1024
          ? `${(bytesWritten / (1024 * 1024)).toFixed(2)} MB`
          : `${(bytesWritten / 1024).toFixed(2)} KB`;
      console.log(`📊 [HTTP Bandwidth] ${req.method} ${req.originalUrl} | ${res.statusCode} | ${sizeStr} | ${duration}ms`);
    }

    return originalEnd.apply(res, [chunk, ...args] as any);
  };

  next();
});

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
app.use('/api/uploads', express.raw({ type: 'application/octet-stream', limit: '50mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/webrtc', webrtcRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', uploadRoutes);

// Global Error Handler Guard
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Express App Error:', err);
  if (!res.headersSent) {
    const origin = req.headers.origin;
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

export default app;
