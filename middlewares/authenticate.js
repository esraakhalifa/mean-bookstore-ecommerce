import process from 'node:process';
import jwt from 'jsonwebtoken';
import CustomError from '../utils/CustomError.js';

const authenticate = (req, res, next) => {
  try {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }

    const authHeader = req.header('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      throw new CustomError('Access denied. No token provided.', 401);
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
