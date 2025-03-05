import express from 'express';
import {UsersController} from '../controllers/index.js';

const router = express.Router();
router.get('/:id', UsersController.getUserData);
router.put('/:id', UsersController.updateUser);
export default router;
