import express from 'express';
import {AdminController} from '../controllers/index.js';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import uploadMiddleware from '../middlewares/cdn.js';
import { uploadImageFunc } from '../middlewares/uploadImage.js';


const router = express.Router();

router.get('/users', authenticate, AdminController.getAllUsers);
router.delete('/users/:id', authenticate,  AdminController.deleteUser);
router.get('/books', authenticate, authorize(["admin"]), AdminController.getAllBooks);
router.get('/books/:id', authenticate, authorize(["admin"]), AdminController.getBook);
router.post('/books', authenticate, authorize(["admin"]), uploadMiddleware.single('image'), AdminController.uploadBook);
router.put('/books/:id', authenticate, authorize(["admin"]), uploadMiddleware.single('image'), AdminController.updateBook);
router.delete('/books/:id', authenticate, authorize(["admin"]),  AdminController.deleteBook);

export default router;