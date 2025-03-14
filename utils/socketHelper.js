import process from 'node:process';
import {RateLimiterMemory} from 'rate-limiter-flexible';
import {Server} from 'socket.io';
import {authenticate, checkMaximumInstances} from '../middlewares/sockets.js';
import CustomError from '../utils/CustomError.js';

let io;
const users = new Map(); // userId -> { sockets: Map<socketId, metadata>, history: Array }
const trackedBooks = new Map(); // bookId -> Set<userId>
const userActivity = new Map(); // userId -> { lastActive: Date, status: string }

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST']
    }
  });
  const rateLimiter = new RateLimiterMemory({
    points: 10,
    duration: 1
  });

  io.use(async (socket, next) => {
    try {
      await rateLimiter.consume(socket.handshake.address);
      next();
    } catch (error) {
      next(new CustomError('Rate limit exceeded', 429));
    }
  });

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
      connectedAt: new Date()
    });

    if (!userActivity.has(userId)) {
      userActivity.set(userId, {
        lastActive: new Date(),
        status: 'online'
      });
    } else {
      userActivity.get(userId).lastActive = new Date();
      userActivity.get(userId).status = 'online';
    }

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

    socket.on('user-status', (status) => {
      if (userActivity.has(userId)) {
        userActivity.get(userId).status = status;
        userActivity.get(userId).lastActive = new Date();
      }
    });

    socket.on('ping', () => {
      if (userActivity.has(userId)) {
        userActivity.get(userId).lastActive = new Date();
      }

      socket.emit('pong', {timestamp: new Date()});
    });

    socket.on('disconnect', () => {
      userData.sockets.delete(socket.id);
      userData.history.push({
        device: socket.user.userAgent.device.type || 'desktop',
        browser: socket.user.userAgent.browser.name,
        ip: socket.user.ip,
        mac: socket.handshake.query.mac,
        disconnectedAt: new Date()
      });

      if (userActivity.has(userId) && userData.sockets.size === 0) {
        userActivity.get(userId).status = 'offline';
        userActivity.get(userId).lastActive = new Date();

        io.to('admin-channel').emit('user-offline', {
          userId,
          lastActive: userActivity.get(userId).lastActive
        });

        if (userData.history.length > 50) {
          userData.history = userData.history.slice(-50);
        }
      }
    });
  });

  setInterval(() => {
    const now = new Date();

    for (const [userId, activity] of userActivity.entries()) {
      if (activity.status === 'offline'
        && now - activity.lastActive > 24 * 60 * 60 * 1000) {
        userActivity.delete(userId);
      }
    }
  }, 60 * 60 * 1000);

  return io;
};

export const getIO = () => {
  if (!io) throw new CustomError('Socket.io not initialized', 500);
  if (!io.httpServer || !io.httpServer.listening) {
    throw new CustomError('Socket.io server not connected', 500);
  }
  return io;
};

export {trackedBooks, userActivity, users};
