import {RateLimiterMemory} from 'rate-limiter-flexible';
import {Server} from 'socket.io';
import {authenticate, checkMaximumInstances} from '../middlewares/sockets.js';

let io;
const usersData = new Map(); // userId -> { sockets: Map<socketId, metadata>, history: Array }
const trackedBooks = new Map(); // bookId -> Set<userId>
const userActivity = new Map(); // userId -> { lastActive: Date, status: string }

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
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
    } catch {
      next(new Error('Rate limit exceeded'));
    }
  });

  io.use(authenticate);
  io.use(checkMaximumInstances(usersData));

  io.on('connection', async (socket) => {
    const userId = socket.user.userId;

    if (!usersData.has(userId)) {
      usersData.set(userId, {
        sockets: new Map(),
        history: []
      });
    }

    const userData = usersData.get(userId);

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
  if (!io) throw new Error('Socket.io not initialized');
  if (!io.httpServer || !io.httpServer.listening) {
    throw new Error('Socket.io server not connected');
  }
  return io;
};

export {trackedBooks, userActivity, usersData};
