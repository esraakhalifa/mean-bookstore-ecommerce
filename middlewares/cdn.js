import { v2 as cloudinary } from 'cloudinary';
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'book_covers',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ 
      width: 200,
      height: 300,
      crop: 'limit',
      quality: 'auto',
      fetch_format: 'auto' 
    }]
  },
});

const uploadMiddleware = multer({ storage });

export default uploadMiddleware;