import express from 'express';
import authRouter from './auth.js';
import homePage from './books_CRUD.js';
import cartRouter from './cart.js';
import ordersRouter from './orders.js';
import usersRouter from './users.js';

const router = express.Router();

router.use('/user', usersRouter);
router.use('/order', ordersRouter);
router.use('/cart', cartRouter);
router.use(authRouter);
router.use(homePage);

export default router;
