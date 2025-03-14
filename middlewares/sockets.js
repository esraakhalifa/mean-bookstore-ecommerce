import process from 'node:process';
import jwt from 'jsonwebtoken';

export const authenticate = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication token is required'));
    }

    const decodedData = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

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
    next(new Error('Authentication error'));
  }
};

export const checkMaximumInstances = (usersData) => {
  return async (socket, next) => {
    const MAX_CONNECTIONS_PER_USER = 6;
    try {
      const userId = socket.user.userId;

      if (!usersData.has(userId)) {
        return next();
      }
      const userData = usersData.get(userId);

      if (userData.sockets.size >= MAX_CONNECTIONS_PER_USER) {
        return next(new Error('Maximum connection limit reached'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
