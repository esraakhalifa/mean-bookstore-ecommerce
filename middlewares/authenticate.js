import process from 'node:process';
import jwt from 'jsonwebtoken';

const authenticate = (req, res, next) => {
  // Check if user is authenticated via OAuth (session-based)
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Check if user is authenticated via JWT
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({message: 'Access denied. No token provided.'});
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({message: 'Invalid token.'});
  }
};

export default authenticate;
