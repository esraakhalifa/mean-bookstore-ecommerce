import CustomError from '../utils/CustomError.js';
import {AddToCartSchema, UpdateCartItemSchema} from './validation/cartSchema.js';

export const validateAddToCart = (req, res, next) => {
  try {
    const validatedData = AddToCartSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    throw new CustomError('Validation error', 400, {
      errors: error.errors || error.message
    });
  }
};

export const validateUpdateCartItem = (req, res, next) => {
  try {
    const validatedData = UpdateCartItemSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    throw new CustomError('Validation error', 400, {
      errors: error.errors || error.message
    });
  }
};
