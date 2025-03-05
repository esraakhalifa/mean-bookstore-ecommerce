import express from 'express';
import authRouter from './auth.js';
import usersRouter from './users.js';

const router = express.Router();

router.use('/user', usersRouter);
router.use('/', authRouter);

export default router;
