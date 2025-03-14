import Users from '../models/users.js';

export const getUserData = async (req, res, next) => {
  try {
    const {id} = req.params;
    if (!id) {
      return res.status(404).json({message: 'User not found'});
    }
    const user = await Users.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({message: 'User not found'});
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
      return res.status(404).json({message: 'User not found'});
    }
    if (updatedData.password) delete updatedData.password;

    // let user = await Users.findById(id);
    // if (!user) {
    //   return res.status(404).json({message: 'User not found'});
    // }

    // // update user fields
    // user = updatedData ? structuredClone(updatedData) : {};
    // console.log(user);
    // await user.save(); // Save updated user to the database

    const updateUser = await Users.findByIdAndUpdate(id, updatedData, {new: true});
    console.log(updateUser);
    res.json({message: 'User updated successfully', user: updateUser});
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const {id} = req.params;

    const deletedUser = await Users.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({message: 'User not found'});
    res.json({message: 'Account deleted successfully'});
  } catch (error) {
    next(error);
  }
};
