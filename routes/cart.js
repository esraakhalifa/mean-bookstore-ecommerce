import express from 'express';
import {CartController} from '../controllers/index.js';
import authenticate from '../middlewares/authenticate.js';
import {validateAddToCart, validateUpdateCartItem} from '../middlewares/validateCart.js';

const router = express.Router();

router.use(authenticate);
router.get('/', CartController.getCart);
router.get('/count', CartController.getCartCount);
router.post('/add', validateAddToCart, CartController.addToCart);
router.put('/update', validateUpdateCartItem, CartController.updateCartItem);
router.delete('/remove/:bookId', CartController.removeFromCart);
router.delete('/clear', CartController.clearCart);

export default router;
