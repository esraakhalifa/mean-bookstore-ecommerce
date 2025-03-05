import {getIo, trackedBooks, users} from '../utils/socketHelper.js';

const io = getIo;

export const notifyUser = (userId, data) => {
  io.to(`user-${userId}`).emit('notification', data);
};

export const notifyAllUsers = (data) => {
  io.emit('notification', data);
};

export const notifyAdmins = (data) => {
  io.to('admin').emit('notification', data);
};

export const notifyUsersByBookId = (bookId, data) => {
  const bookUsers = trackedBooks.get(bookId) || new Set();
  for (const userId of bookUsers) {
    io.to(`user-${userId}`).emit('notification', data);
  }
};

export const trackBook = (bookId, userId) => {
  trackedBooks.set(bookId, (trackedBooks.get(bookId) || new Set()).add(userId));
};

export const untrackBook = (bookId, userId) => {
  trackedBooks.set(bookId, (trackedBooks.get(bookId) || new Set()).delete(userId));
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
