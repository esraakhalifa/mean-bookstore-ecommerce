import express from 'express';
import {usersController} from '../controllers/index.js';

const router = express.Router();
router.get('/:id', usersController.getUserData);
router.put('/:id', usersController.updateUser);
export default router;
