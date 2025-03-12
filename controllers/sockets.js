import {getIO, trackedBooks, userActivity, users} from '../utils/socketHelper.js';

const io = getIO();

export const notifyUser = (userId, data) => {
  io.to(`user-${userId}`).emit('notification', data);
};

export const notifyAllUsers = (data) => {
  io.emit('notification', data);
};

export const notifyAdmins = (data) => {
  io.to('admin-channel').emit('notification', data);
};

export const notifyUsersByBookId = (bookId, data) => {
  const bookUsers = trackedBooks.get(bookId) || new Set();
  for (const userId of bookUsers) {
    io.to(`user-${userId}`).emit('notification', data);
  }
};

export const trackBook = (bookId, userId) => {
  if (!trackedBooks.has(bookId)) {
    trackedBooks.set(bookId, new Set());
  }
  trackedBooks.get(bookId).add(userId);
};

export const untrackBook = (bookId, userId) => {
  if (trackedBooks.has(bookId)) {
    const userSet = trackedBooks.get(bookId);
    userSet.delete(userId);
    if (userSet.size === 0) {
      trackedBooks.delete(bookId);
    }
  }
};

export const untrackAllBooks = (userId) => {
  for (const bookId of trackedBooks.keys()) {
    untrackBook(bookId, userId);
  }
};

export const untrackUser = (userId) => {
  for (const bookId of trackedBooks.keys()) {
    untrackBook(bookId, userId);
  }
};

export const untrackAllUsers = () => {
  for (const userId of users.keys()) {
    untrackUser(userId);
  }
};

export const notifyUsersByRole = (role, data) => {
  const io = getIO();

  for (const [userId, userData] of users.entries()) {
    if (userData.role === role && userData.sockets.size > 0) {
      io.to(`user-${userId}`).emit('notification', data);
    }
  }
};

export const notifyActiveUsers = (data, timeThreshold = 15) => {
  const io = getIO();
  const thresholdTime = new Date();
  thresholdTime.setMinutes(thresholdTime.getMinutes() - timeThreshold);

  for (const [userId, activity] of userActivity.entries()) {
    if (activity.lastActive >= thresholdTime && users.has(userId) && users.get(userId).sockets.size > 0) {
      io.to(`user-${userId}`).emit('notification', data);
    }
  }
};

export const broadcastSystemStatus = (status) => {
  const io = getIO();
  io.emit('system-status', {
    status,
    timestamp: new Date()
  });
};
