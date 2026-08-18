import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { env } from './config/env';
import { setupSocketIO } from './websocket/socketHandler';
import { cleanupWorker } from './services/cleanup/CleanupWorker';

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
});

setupSocketIO(io);

// Start Background Segment Cleanup Worker
cleanupWorker.start();

const PORT = parseInt(env.PORT, 10) || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MyDonkey Call Backend running on http://localhost:${PORT} (Accessible on Local Network)`);
});
