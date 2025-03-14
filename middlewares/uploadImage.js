import CustomError from '../utils/CustomError.js';

export const uploadImageFunc = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new CustomError('Please upload an image', 400);
    }

    const imageUrl = req.file.path;
    return res.status(201).json({
      message: 'Image uploaded successfully',
      imageUrl
    });
  } catch (error) {
    console.error('Upload Image Error');
    next(error);
  }
};
