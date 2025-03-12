import express from 'express';
import * as OrderController from '../controllers/orders.js';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';

const router = express.Router();

router.get('/:id', OrderController.getOrderById);
router.post('/', authenticate, OrderController.createOrder);
router.get('/user/:userId', authenticate, OrderController.getUserOrders);

router.get('/', authenticate, authorize('admin'), OrderController.getOrders);
router.put('/:id', authenticate, authorize('admin'), OrderController.updateOrder);
router.delete('/:id', authenticate, authorize('admin'), OrderController.deleteOrder);
router.get('/stats/overview', authenticate, authorize('admin'), OrderController.getOrderStats);
router.get('/stats/popular-books', authenticate, authorize('admin'), OrderController.getPopularBooks);
router.get('/stats/customer/:userId', authenticate, authorize('admin'), OrderController.getCustomerPurchaseHistory);

export default router;
