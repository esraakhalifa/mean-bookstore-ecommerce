import express from 'express';
import {CartController} from '../controllers/index.js';

const router = express.Router();
router.get('/:id', CartController.getUserCartData);
router.post('/add/:id', CartController.addToCart);
router.post('/remove/:id', CartController.removeFromCart);

export default router;
