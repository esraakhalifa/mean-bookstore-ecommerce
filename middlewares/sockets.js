import process from 'node:process';
import jwt from 'jsonwebtoken';
import CustomError from '../utils/CustomError.js';

export const authenticate = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      throw new CustomError('Authentication token is required', 401);
    }

    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    decodedData.userAgent = socket.handshake.headers['user-agent']
      ? {
          browser: {name: 'unknown'},
          device: {type: 'unknown'}
        }
      : socket.handshake.headers['user-agent'];

    decodedData.ip = socket.handshake.address;
    decodedData.connectedAt = new Date();

    socket.user = decodedData;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new CustomError('Invalid or expired token', 401);
    }

    next(new CustomError('Authentication error', 401));
  }
};

export const checkMaximumInstances = (users) => {
  return async (socket, next) => {
    const MAX_CONNECTIONS_PER_USER = 6;
    try {
      const userId = socket.user.id;

      if (!users.has(userId)) {
        return next();
      }

      const userData = users.get(userId);
      if (userData.sockets.size >= MAX_CONNECTIONS_PER_USER) {
        throw new CustomError('Maximum connection limit reached', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
