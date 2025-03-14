import express from 'express';
import {UsersController} from '../controllers/index.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();
router.get('/:id', authenticate, UsersController.getUserData);
router.put('/:id', authenticate, UsersController.updateUser);
export default router;
