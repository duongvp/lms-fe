import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';

// Initialize the socket singleton
const socketInstance = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  autoConnect: true, // Auto connect upon instantiation
});

interface SocketState {
  socket: Socket;
  isConnected: boolean;
}

export const useSocketStore = create<SocketState>((set) => {
  // Listen to connection events to update the state
  socketInstance.on('connect', () => {
    console.log('[Global Socket] Connected:', socketInstance.id);
    set({ isConnected: true });
  });

  socketInstance.on('disconnect', () => {
    console.log('[Global Socket] Disconnected');
    set({ isConnected: false });
  });

  return {
    socket: socketInstance,
    isConnected: socketInstance.connected,
  };
});
