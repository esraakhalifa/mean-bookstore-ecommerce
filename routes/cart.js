import express from 'express';
import {CartController} from '../controllers/index.js';
import authenticate from '../middlewares/authenticate.js';
import {validateAddToCart, validateUpdateCartItem} from '../middlewares/validateCart.js';

const router = express.Router();

router.use(authenticate);
router.get('/', authenticate, CartController.getCart);
router.get('/count', authenticate, CartController.getCartCount);
router.post('/add', authenticate, validateAddToCart, CartController.addToCart);
router.put('/update', authenticate, validateUpdateCartItem, CartController.updateCartItem);
router.delete('/remove/:bookId', authenticate, CartController.removeFromCart);
router.delete('/clear', authenticate, CartController.clearCart);

export default router;
