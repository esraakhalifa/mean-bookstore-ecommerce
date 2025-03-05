import process from 'node:process';
import jwt from 'jsonwebtoken';

export const authenticate = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decodedData;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
};

export const checkMaximumInstances
  = async (io, users) => {
    return async (socket, next) => {
      const MAX_USERS_PER_ROOM = 6;
      try {
        const userRoom = `user-${socket.user.id}`;

        const room = users.get(userRoom);
        const currentCount = room ? room.sockets.size : 0;

        if (currentCount >= MAX_USERS_PER_ROOM) {
          return next(new Error('ROOM_FULL'));
        }

        socket.room = userRoom;
        next();
      } catch (error) {
        next(error);
      }
    };
  };
