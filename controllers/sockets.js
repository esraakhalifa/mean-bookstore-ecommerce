import {getIO, trackedBooks, userActivity, usersData} from '../utils/socketHelper.js';

export const notifyUser = (userId, data) => {
  const io = getIO();

  io.to(`user-${userId}`).emit('notification', data);
};

export const notifyAllUsers = (data) => {
  const io = getIO();

  io.emit('notification', data);
};

export const notifyAdmins = (data) => {
  const io = getIO();

  io.to('admin-channel').emit('notification', data);
};

export const notifyAdminsUserOrder = (data) => {
  const io = getIO();

  io.to('admin-channel').emit('new-order', data);
};

export const notifyUsersByBookId = (bookId, data) => {
  const io = getIO();
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
  for (const userId of usersData.keys()) {
    untrackUser(userId);
  }
};

export const notifyUsersByRole = (role, data) => {
  const io = getIO();

  for (const [userId, userData] of usersData.entries()) {
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
    if (activity.lastActive >= thresholdTime && usersData.has(userId) && users.get(userId).sockets.size > 0) {
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
