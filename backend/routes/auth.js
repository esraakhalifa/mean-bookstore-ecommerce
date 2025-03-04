import express from 'express';
import { authController } from '../controllers/index.js';

const router = express.Router();

router.get('/login', authController.getLogin);
router.get('/signup', authController.getSignup);
router.post('/login', authController.postLogin);
router.post('/signup', authController.postSignup);
router.post('/refresh', authController.postRefresh);
router.post('/logout', authController.postLogout);
router.get('/verify/:token', authController.emailVerify);
export default router;