import process from 'node:process';
import CustomError from '../utils/CustomError.js';

const castErrorDBHandler = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new CustomError(message, 400);
};

const duplicateValueDBHandler = (err) => {
  const message = `Duplicate value: ${Object.values(err.keyValue).join(', ')}. Enter another value`;
  return new CustomError(message, 400);
};

const validationErrorDBHandler = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input. ${errors.join('. ')}`;
  return new CustomError(message, 400);
};

const errorDevSend = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const errorProdSend = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    console.error('Error msg:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    errorDevSend(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = {...err};
    error.message = err.message;
    if (error.name === 'CastError') error = castErrorDBHandler(error);
    if (error.code === 11000) error = duplicateValueDBHandler(error);
    if (error.name === 'ValidationError') error = validationErrorDBHandler(error);
    errorProdSend(error, res);
  }
};

export default errorHandler;
