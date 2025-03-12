import express from 'express';
import adminRouter from './admin.js';
import authRouter from './auth.js';
import homePage from './books_CRUD.js';
import cartRouter from './cart.js';
import notificationsRouter from './notifications.js';
import ordersRouter from './orders.js';
import usersRouter from './users.js';

const router = express.Router();

router.use('/admin', adminRouter);
router.use('/user', usersRouter);
router.use('/order', ordersRouter);
router.use('/cart', cartRouter);
router.use('/notifications', notificationsRouter);
router.use(authRouter);
router.use(homePage);

export default router;
