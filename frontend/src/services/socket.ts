import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '../types';
import { BACKEND_URL } from '../config/apiConfig';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketInstance: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socketInstance) {
    const token = localStorage.getItem('mydonkey_token') || '';
    const socketOptions = {
      autoConnect: false,
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 30000,
    };
    socketInstance = BACKEND_URL
      ? io(BACKEND_URL, socketOptions)
      : io(socketOptions);
  }
  return socketInstance;
}

export function connectSocket(token?: string): TypedSocket {
  const socket = getSocket();
  const activeToken = token || localStorage.getItem('mydonkey_token') || '';

  socket.auth = { token: activeToken };
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
