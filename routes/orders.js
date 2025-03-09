import express from 'express';
import {OrderController} from '../controllers/index.js';

const router = express.Router();
router.get('/order-history/:id', OrderController.getUserOrders);
export default router;
