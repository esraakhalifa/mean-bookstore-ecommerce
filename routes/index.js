import express from 'express';
import authRoute from './auth.js';
import homePage from './books_CRUD.js';

const router = express.Router();

router.use(authRoute);
router.use(homePage);

export default router;
