import express from 'express';
import {OrderController} from '../controllers/index.js';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';

const router = express.Router();

router.get('/:id', OrderController.getOrderById);
router.post('/', authenticate, OrderController.createOrder);
router.get('/user/:userId', authenticate, OrderController.getUserOrders);

router.get('/', authenticate, authorize('admin'), OrderController.getOrders);
router.put('/:id', authenticate, authorize('admin'), OrderController.updateOrder);
router.delete('/:id', authenticate, authorize('admin'), OrderController.deleteOrder);
router.get('/stats/popular-books', authenticate, authorize('admin'), OrderController.getPopularBooks);

export default router;
