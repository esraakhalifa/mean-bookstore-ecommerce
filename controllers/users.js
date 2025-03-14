import Users from '../models/users.js';
import CustomError from '../utils/CustomError.js';

export const getUserData = async (req, res, next) => {
  try {
    const {id} = req.params;
    if (!id) {
      throw new CustomError('User ID is required', 400);
    }

    const user = await Users.findById(id).select('-password');
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const {id} = req.params;
    const updatedData = req.body;

    if (!id) {
      throw new CustomError('User ID is required', 400);
    }

    if (updatedData.password) {
      delete updatedData.password;
    }

    const updatedUser = await Users.findByIdAndUpdate(id, updatedData, {new: true});
    if (!updatedUser) {
      throw new CustomError('User not found', 404);
    }

    res.json({message: 'User updated successfully', user: updatedUser});
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const {id} = req.params;

    if (!id) {
      throw new CustomError('User ID is required', 400);
    }

    const deletedUser = await Users.findByIdAndDelete(id);
    if (!deletedUser) {
      throw new CustomError('User not found', 404);
    }

    res.json({message: 'Account deleted successfully'});
  } catch (error) {
    next(error);
  }
};
