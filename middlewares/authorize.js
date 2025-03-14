import CustomError from '../utils/CustomError.js';

const authorize = (roles) => {
  return (req, res, next) => {
    try {
      if (!roles.includes(req.user.role)) {
        throw new CustomError('Access denied. You do not have permission.', 403);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default authorize;
