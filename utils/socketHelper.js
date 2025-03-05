import process from 'node:process';
import {Server} from 'socket.io';
import rateLimiter from 'socket.io-rate-limiter';
import {authenticate, checkMaximumInstances} from '../middlewares/sockets.js';

let io;
const users = new Map(); // userId -> { sockets: Map<socketId, metadata>, history: Array }
const trackedBooks = new Map(); // bookId -> Set<userId>

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST']
    }
  });
  const authLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // 5 attempts
  });

  io.use(authLimiter);
  io.use(authenticate);
  io.use(checkMaximumInstances(io, users));

  io.on('connection', async (socket) => {
    const userId = socket.user.id;

    if (!users.has(userId)) {
      users.set(userId, {
        sockets: new Map(),
        history: []
      });
    }

    const userData = users.get(userId);

    userData.sockets.set(socket.id, {
      device: socket.user.userAgent.device.type || 'desktop',
      browser: socket.user.userAgent.browser.name,
      ip: socket.user.ip,
      mac: socket.handshake.query.mac,
      connectedAt: socket.user.connectedAt
    });

    await socket.join(`user-${userId}`);

    if (socket.user.role === 'admin') {
      socket.join('admin-channel');
    }

    socket.on('track-book', (bookId) => {
      if (!trackedBooks.has(bookId)) {
        trackedBooks.set(bookId, new Set());
      }
      trackedBooks.get(bookId).add(userId);
    });

    socket.on('disconnect', () => {
      userData.sockets.delete(socket.id);
      userData.history.push({
        device: socket.user.device,
        browser: socket.user.userAgent.browser.name,
        ip: socket.user.ip,
        mac: socket.handshake.query.mac,
        disconnectedAt: new Date()
      });

      // io.to('admin-channel').emit('user-presence', {
      //   userId,
      //   online: userData.sockets.size > 0
      // });
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
